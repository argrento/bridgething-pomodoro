import { BridgethingClient } from '@bridgething/client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Dial from './Dial';
import {
  complete,
  formatClock,
  formatDuration,
  hold,
  initialState,
  PHASE_LABEL,
  phaseMs,
  press,
  remainingMs,
  rollDay,
  SESSIONS_PER_SET,
  setPreset,
  turn,
  type TimerState,
} from './timer';

/** One detent of the Car Thing's rotary encoder, as delivered by Chromium. */
const DETENT = 120;
const HOLD_MS = 700;
const STORE_KEY = 'pomodoro.v1';
const PRESETS: Record<string, number> = { Digit1: 15, Digit2: 25, Digit3: 45, Digit4: 60 };
const CHIME_HINTS = ['complete', 'done', 'success', 'chime', 'notif', 'alert', 'ding'];

export default function App() {
  const client = useMemo(() => new BridgethingClient({ url: `ws://${window.location.host}/` }), []);

  const [state, setState] = useState<TimerState>(() => loadLocal() ?? initialState(Date.now()));
  const [now, setNow] = useState(() => Date.now());
  const [holding, setHolding] = useState(false);
  const [flash, setFlash] = useState(0);
  const [bump, setBump] = useState(0);
  const loaded = useRef(false);
  const earcon = useRef<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Restore from the daemon's per-app store; localStorage covers the gap
  // while the socket settles (and desktop dev, where there is no daemon).
  useEffect(() => {
    let cancelled = false;
    client.store
      .get({ key: STORE_KEY })
      .then(r => {
        if (cancelled || !r.ok || !r.response.value) return;
        const saved = parse(r.response.value);
        if (saved) setState(saved);
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
      });
    const offCaps = client.capabilities.onUpdate(snap => {
      const names = snap.capabilities.audio.earcons;
      earcon.current =
        names.find(n => CHIME_HINTS.some(h => n.toLowerCase().includes(h))) ?? names[0] ?? null;
    });
    return () => {
      cancelled = true;
      offCaps();
    };
  }, [client]);

  // Persist, debounced.
  useEffect(() => {
    const json = JSON.stringify(state);
    try {
      localStorage.setItem(STORE_KEY, json);
    } catch {}
    if (!loaded.current) return;
    const t = setTimeout(() => {
      client.store.put({ key: STORE_KEY, value: json }).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [state, client]);

  const chime = useCallback(() => {
    setFlash(f => f + 1);
    const name = earcon.current;
    if (name) client.audio.earcon({ name }).catch(() => {});
  }, [client]);

  // Clock. Times are derived from epoch timestamps, so a throttled or
  // backgrounded page catches up correctly instead of drifting.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (state.mode === 'running' && now >= state.endsAt) {
      setState(s => complete(s, Date.now()));
      chime();
    } else if (state.mode === 'idle') {
      const rolled = rollDay(state, now);
      if (rolled !== state) setState(rolled);
    }
  }, [now, state, chime]);

  const doPress = useCallback(() => {
    setState(s => press(s, Date.now()));
    setNow(Date.now());
  }, []);
  const doHold = useCallback(() => {
    setState(s => hold(s));
    setNow(Date.now());
  }, []);

  // Input: rotary encoder (REL_HWHEEL → wheel deltaX), knob press (Enter),
  // preset buttons (Digit1-4). Short press toggles, long press stops/skips.
  const holdTimer = useRef<number | null>(null);
  const held = useRef(false);
  const pressDown = useCallback(() => {
    if (holdTimer.current !== null) return;
    held.current = false;
    setHolding(true);
    holdTimer.current = window.setTimeout(() => {
      held.current = true;
      setHolding(false);
      doHold();
    }, HOLD_MS);
  }, [doHold]);
  const pressUp = useCallback(() => {
    if (holdTimer.current === null) return;
    clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHolding(false);
    if (!held.current) doPress();
  }, [doPress]);

  useEffect(() => {
    let carry = 0;
    const onWheel = (e: WheelEvent) => {
      const total = carry + (e.deltaX !== 0 ? e.deltaX : e.deltaY);
      const steps = Math.trunc(total / DETENT) || 0;
      carry = total - steps * DETENT;
      if (!steps) return;
      setState(s => turn(s, steps, Date.now()));
      setBump(b => b + 1);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) pressDown();
      } else if (PRESETS[e.code]) {
        setState(s => setPreset(s, PRESETS[e.code]));
        setBump(b => b + 1);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') pressUp();
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [pressDown, pressUp]);

  const left = remainingMs(state, now);
  const total = phaseMs(state);
  const endsAt = state.mode === 'running' ? state.endsAt : now + left;
  const dots = Array.from({ length: SESSIONS_PER_SET }, (_, i) => {
    if (i < state.cycle) return 'done';
    if (i === state.cycle && state.phase === 'focus' && state.mode !== 'idle') return 'live';
    return '';
  });

  return (
    <div className={`app phase-${state.phase} mode-${state.mode}`}>
      <div className="glow" />
      <div key={flash} className={flash ? 'flash' : ''} />

      <div
        className="dial-wrap"
        onPointerDown={pressDown}
        onPointerUp={pressUp}
        onPointerLeave={pressUp}
      >
        <Dial minutes={left / 60_000} holding={holding} />
        <div className="center">
          {state.mode === 'idle' ? (
            <>
              <div key={bump} className="big bump">
                {state.settings[state.phase]}
              </div>
              <div className="unit">{state.settings[state.phase] === 1 ? 'minute' : 'minutes'}</div>
            </>
          ) : (
            <>
              <div className="clock">{formatClock(left)}</div>
              <div className="unit">{state.mode === 'paused' ? 'paused' : PHASE_LABEL[state.phase]}</div>
            </>
          )}
        </div>
      </div>

      <aside className="panel">
        <div className="now">
          <span>{clock(now)}</span>
          <span className="ends">
            {state.mode === 'paused' ? 'on hold' : `ends ${clock(endsAt)}`}
          </span>
        </div>

        <div className="phase">
          <div className="eyebrow">
            {state.mode === 'idle' ? (state.phase === 'focus' ? 'Ready' : 'Up next') : 'Now'}
          </div>
          <h1>{PHASE_LABEL[state.phase]}</h1>
          <div className="dots">
            {dots.map((d, i) => (
              <span key={i} className={`dot ${d}`} />
            ))}
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ transform: `scaleX(${state.mode === 'idle' ? 0 : 1 - left / total})` }}
            />
          </div>
        </div>

        <div className="today">
          <div>
            <b>{state.todaySessions}</b>
            <span>{state.todaySessions === 1 ? 'session' : 'sessions'}</span>
          </div>
          <div>
            <b>{formatDuration(state.todayFocusMin)}</b>
            <span>focused today</span>
          </div>
        </div>

        <ul className="hints">
          <li>
            <i className="ico ico-turn" />
            {state.mode === 'idle' ? 'Turn to set time' : 'Turn to add or remove a minute'}
          </li>
          <li>
            <i className="ico ico-press" />
            {state.mode === 'running' ? 'Press to pause' : state.mode === 'paused' ? 'Press to resume' : 'Press to start'}
          </li>
          <li>
            <i className="ico ico-hold" />
            {state.mode !== 'idle'
              ? 'Hold to stop'
              : state.phase !== 'focus'
                ? 'Hold to skip break'
                : 'Hold to reset set'}
          </li>
        </ul>
      </aside>
    </div>
  );
}

function clock(t: number) {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function parse(json: string): TimerState | null {
  try {
    const s = JSON.parse(json) as TimerState;
    return s && s.settings && s.mode ? s : null;
  } catch {
    return null;
  }
}

function loadLocal(): TimerState | null {
  try {
    const v = localStorage.getItem(STORE_KEY);
    return v ? parse(v) : null;
  } catch {
    return null;
  }
}
