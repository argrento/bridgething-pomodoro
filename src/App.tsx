import { BridgethingClient } from '@bridgething/client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Dial from './Dial';
import { assessClock, formatDrift, TOLERANCE_MS } from './clock';
import History from './History';
import {
  complete,
  dayTotals,
  decodeHistory,
  encodeHistory,
  formatClock,
  formatDuration,
  hold,
  initialState,
  localDay,
  PHASE_LABEL,
  phaseMs,
  press,
  remainingMs,
  SESSIONS_PER_SET,
  setPreset,
  turn,
  type HistoryEntry,
  type TimerState,
} from './timer';

/** One detent of the Car Thing's rotary encoder, as delivered by Chromium. */
const DETENT = 120;
const HOLD_MS = 700;
const STORE_KEY = 'pomodoro.v1';
const HISTORY_KEY = 'pomodoro.history.v1';
/** Boot id on which the clock was last confirmed good. */
const CLOCK_KEY = 'pomodoro.clock-trust.v1';
const PRESETS: Record<string, number> = { Digit1: 15, Digit2: 25, Digit3: 45 };
const HISTORY_BUTTON = 'Digit4';
/** How far back the history view scrolls, in days. */
const HISTORY_DAYS = 366;
const CHIME_HINTS = ['complete', 'done', 'success', 'chime', 'notif', 'alert', 'ding'];

export default function App() {
  const client = useMemo(() => new BridgethingClient({ url: `ws://${window.location.host}/` }), []);

  const [state, setState] = useState<TimerState>(() => loadLocal() ?? initialState(Date.now()));
  const [view, setView] = useState<'timer' | 'history'>('timer');
  const [histSel, setHistSel] = useState(0);
  const [bootId, setBootId] = useState<string | null>(null);
  const [trustedBootId, setTrustedBootId] = useState<string | null>(() => readLocal(CLOCK_KEY));
  const [phoneDriftMs, setPhoneDriftMs] = useState<number | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
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
  // History lives under its own key so the frequent timer writes stay small.
  useEffect(() => {
    let cancelled = false;
    const value = (key: string) =>
      client.store
        .get({ key })
        .then(r => (r.ok ? r.response.value : null))
        .catch(() => null);
    Promise.all([value(STORE_KEY), value(HISTORY_KEY)])
      .then(([timerJson, historyJson]) => {
        if (cancelled) return;
        const saved = timerJson ? parse(timerJson) : null;
        const history = historyJson ? decodeHistory(historyJson) : null;
        setState(s => {
          const next = saved ?? s;
          // Union with anything logged locally before the store answered.
          return { ...next, history: mergeHistory(history ?? [], s.history) };
        });
      })
      .finally(() => {
        loaded.current = true;
      });
    // Clock evidence: which boot this is, what we trusted before, and the
    // phone's wall clock whenever a gateway supplies one.
    client.system
      .diagnosticsGet()
      .then(r => !cancelled && r.ok && setBootId(r.response.diagnostics.bootId))
      .catch(() => {});
    client.store
      .get({ key: CLOCK_KEY })
      .then(r => !cancelled && r.ok && r.response.value && setTrustedBootId(r.response.value))
      .catch(() => {});
    const onTime = (t: { time: { wallClockUnixS: number | null } }) => {
      if (t.time.wallClockUnixS !== null) setPhoneDriftMs(Date.now() - t.time.wallClockUnixS * 1000);
    };
    client.time
      .get()
      .then(r => !cancelled && r.ok && onTime(r.response))
      .catch(() => {});
    const offTime = client.time.subscribePartial({ changed: onTime, snapshot: onTime });
    const offCaps = client.capabilities.onUpdate(snap => {
      const names = snap.capabilities.audio.earcons;
      earcon.current =
        names.find(n => CHIME_HINTS.some(h => n.toLowerCase().includes(h))) ?? names[0] ?? null;
    });
    return () => {
      cancelled = true;
      offCaps();
      offTime();
    };
  }, [client]);

  // Persist, debounced. The history is only rewritten when it changes.
  const { history, ...timer } = state;
  const timerJson = JSON.stringify(timer);
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, timerJson);
    } catch {}
    if (!loaded.current) return;
    const t = setTimeout(() => {
      client.store.put({ key: STORE_KEY, value: timerJson }).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [timerJson, client]);
  useEffect(() => {
    const json = encodeHistory(history);
    try {
      localStorage.setItem(HISTORY_KEY, json);
    } catch {}
    if (!loaded.current) return;
    client.store.put({ key: HISTORY_KEY, value: json }).catch(() => {});
  }, [history, client]);

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
      setState(s => complete(s));
      chime();
    }
  }, [now, state, chime]);

  const doPress = useCallback(() => {
    setState(s => press(s, Date.now()));
    setNow(Date.now());
  }, []);
  const doHold = useCallback(() => {
    setState(s => hold(s, Date.now()));
    setNow(Date.now());
  }, []);

  // Input: rotary encoder (REL_HWHEEL → wheel deltaX), knob press (Enter),
  // preset buttons (Digit1-4). Short press toggles, long press stops/skips.
  const holdTimer = useRef<number | null>(null);
  const held = useRef(false);
  const closing = useRef(false);
  const trustClock = useCallback(() => {
    if (!bootId) return;
    setTrustedBootId(bootId);
    try {
      localStorage.setItem(CLOCK_KEY, bootId);
    } catch {}
    client.store.put({ key: CLOCK_KEY, value: bootId }).catch(() => {});
  }, [bootId, client]);
  // A phone clock that agrees with ours vouches for this whole boot.
  useEffect(() => {
    if (bootId && bootId !== trustedBootId && phoneDriftMs !== null && Math.abs(phoneDriftMs) <= TOLERANCE_MS) {
      trustClock();
    }
  }, [bootId, trustedBootId, phoneDriftMs, trustClock]);
  const toggleHistory = useCallback(() => {
    setHistSel(0);
    setView(v => (v === 'timer' ? 'history' : 'timer'));
  }, []);
  const pressDown = useCallback(() => {
    if (viewRef.current === 'history') {
      closing.current = true;
      return;
    }
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
    if (closing.current) {
      closing.current = false;
      setView('timer');
      return;
    }
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
      if (viewRef.current === 'history') {
        // Clockwise moves forward in time, toward today.
        setHistSel(d => Math.min(HISTORY_DAYS, Math.max(0, d - steps)));
        return;
      }
      setState(s => turn(s, steps, Date.now()));
      setBump(b => b + 1);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) pressDown();
      } else if (e.code === HISTORY_BUTTON) {
        toggleHistory();
      } else if (PRESETS[e.code] && viewRef.current === 'timer') {
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
  }, [pressDown, pressUp, toggleHistory]);

  const left = remainingMs(state, now);
  const total = phaseMs(state);
  const endsAt = state.mode === 'running' ? state.endsAt : now + left;
  const dots = Array.from({ length: SESSIONS_PER_SET }, (_, i) => {
    if (i < state.cycle) return 'done';
    if (i === state.cycle && state.phase === 'focus' && state.mode !== 'idle') return 'live';
    return '';
  });
  const today = dayTotals(history, localDay(now));
  const clockStatus = assessClock({
    phoneDriftMs,
    lastLoggedEnd: history.length ? history[history.length - 1].end : null,
    now,
    bootId,
    trustedBootId,
  });

  if (view === 'history') {
    return (
      <div className={`app phase-focus`} onPointerDown={pressDown} onPointerUp={pressUp}>
        <div className="glow" />
        <History history={history} now={now} selected={histSel} />
      </div>
    );
  }

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
        {clockStatus.kind === 'ok' ? (
          <div className="now">
            <span>{clock(now)}</span>
            <span className="ends">
              {state.mode === 'paused' ? 'on hold' : `ends ${clock(endsAt)}`}
            </span>
          </div>
        ) : (
          <div
            className={`clock-warn ${clockStatus.kind}`}
            onClick={clockStatus.kind === 'unverified' ? trustClock : undefined}
          >
            <i className="warn-ico">!</i>
            <div>
              <b>
                {clockStatus.kind === 'behind'
                  ? `Clock is ${formatDrift(clockStatus.behindMs)} behind`
                  : `Clock may be wrong · ${clock(now)}`}
              </b>
              <span>
                {clockStatus.kind === 'behind'
                  ? 'History dates will be off. Connect phone to sync.'
                  : 'Device was powered off. Tap if the time is right.'}
              </span>
            </div>
          </div>
        )}

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

        <div className="today" onClick={toggleHistory}>
          <div>
            <b>{today.sessions}</b>
            <span>{today.sessions === 1 ? 'session' : 'sessions'}</span>
          </div>
          <div>
            <b>{formatDuration(today.minutes)}</b>
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
          <li>
            <i className="ico ico-key">4</i>
            Button 4 for history
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

/** Timer state without history; fields added since a save fall back to defaults. */
function parse(json: string): TimerState | null {
  try {
    const s = JSON.parse(json) as Partial<TimerState>;
    if (!s || !s.settings || !s.mode) return null;
    const base = initialState(Date.now());
    return { ...base, ...s, startedAt: s.startedAt ?? base.startedAt, history: [] };
  } catch {
    return null;
  }
}

function mergeHistory(a: HistoryEntry[], b: HistoryEntry[]): HistoryEntry[] {
  if (!b.length) return a;
  if (!a.length) return b;
  const byStart = new Map<number, HistoryEntry>();
  for (const e of [...a, ...b]) byStart.set(e.start, e);
  return [...byStart.values()].sort((x, y) => x.start - y.start);
}

function loadLocal(): TimerState | null {
  try {
    const v = localStorage.getItem(STORE_KEY);
    const s = v ? parse(v) : null;
    const h = localStorage.getItem(HISTORY_KEY);
    return s && h ? { ...s, history: decodeHistory(h) ?? [] } : s;
  } catch {
    return null;
  }
}

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
