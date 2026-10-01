import { BridgethingClient } from '@bridgething/client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { assessClock, TOLERANCE_MS } from './clock';
import { historyModel, timerModel } from './model';
import Settings from './Settings';
import { DEFAULT_THEME, themeById, THEMES } from './themes';
import {
  complete,
  decodeHistory,
  encodeHistory,
  hold,
  initialState,
  press,
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
/** The mic button on top of the Car Thing opens the design picker. */
const SETTINGS_BUTTON = 'KeyM';
/** The back button below the knob. */
const BACK_BUTTON = 'Escape';
const THEME_KEY = 'pomodoro.theme.v1';
/** How far back the history view scrolls, in days. */
const HISTORY_DAYS = 366;
const CHIME_HINTS = ['complete', 'done', 'success', 'chime', 'notif', 'alert', 'ding'];

export default function App() {
  const client = useMemo(() => new BridgethingClient({ url: `ws://${window.location.host}/` }), []);

  const [state, setState] = useState<TimerState>(() => loadLocal() ?? initialState(Date.now()));
  const [view, setView] = useState<'timer' | 'history' | 'settings'>('timer');
  const [themeId, setThemeId] = useState<string>(() => readLocal(THEME_KEY) ?? DEFAULT_THEME);
  const [picked, setPicked] = useState(0);
  const pickedRef = useRef(picked);
  pickedRef.current = picked;
  const [histSel, setHistSel] = useState(0);
  const [bootId, setBootId] = useState<string | null>(null);
  const [trustedBootId, setTrustedBootId] = useState<string | null>(() => readLocal(CLOCK_KEY));
  const [phoneDriftMs, setPhoneDriftMs] = useState<number | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const themeIdRef = useRef(themeId);
  themeIdRef.current = themeId;
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
      .get({ key: THEME_KEY })
      .then(r => !cancelled && r.ok && r.response.value && setThemeId(r.response.value))
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
  const applyTheme = useCallback(
    (index: number) => {
      const id = THEMES[index].id;
      setThemeId(id);
      setView('timer');
      try {
        localStorage.setItem(THEME_KEY, id);
      } catch {}
      client.store.put({ key: THEME_KEY, value: id }).catch(() => {});
    },
    [client],
  );
  const toggleSettings = useCallback(() => {
    setView(v => {
      if (v === 'settings') return 'timer';
      setPicked(Math.max(0, THEMES.findIndex(t => t.id === themeIdRef.current)));
      return 'settings';
    });
  }, []);
  const toggleHistory = useCallback(() => {
    setHistSel(0);
    setView(v => (v === 'timer' ? 'history' : 'timer'));
  }, []);
  const pressDown = useCallback(() => {
    if (viewRef.current !== 'timer') {
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
      if (viewRef.current === 'settings') applyTheme(pickedRef.current);
      else setView('timer');
      return;
    }
    if (holdTimer.current === null) return;
    clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHolding(false);
    if (!held.current) doPress();
  }, [doPress, applyTheme]);

  useEffect(() => {
    let carry = 0;
    const onWheel = (e: WheelEvent) => {
      const total = carry + (e.deltaX !== 0 ? e.deltaX : e.deltaY);
      const steps = Math.trunc(total / DETENT) || 0;
      carry = total - steps * DETENT;
      if (!steps) return;
      if (viewRef.current === 'settings') {
        setPicked(p => (((p + steps) % THEMES.length) + THEMES.length) % THEMES.length);
        return;
      }
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
      } else if (e.code === SETTINGS_BUTTON) {
        toggleSettings();
      } else if (e.code === BACK_BUTTON) {
        setView('timer');
      } else if (e.code === HISTORY_BUTTON) {
        if (viewRef.current === 'settings') setView('timer');
        else toggleHistory();
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
  }, [pressDown, pressUp, toggleHistory, toggleSettings]);

  const clockStatus = assessClock({
    phoneDriftMs,
    lastLoggedEnd: history.length ? history[history.length - 1].end : null,
    now,
    bootId,
    trustedBootId,
  });
  // While picking, the screen behind the picker is the live preview.
  const theme = view === 'settings' ? THEMES[picked] : themeById(themeId);
  const knob = { onPointerDown: pressDown, onPointerUp: pressUp, onPointerLeave: pressUp };

  return (
    <div className="stage">
      <div className={`theme-${theme.id}`}>
        {view === 'history' ? (
          <theme.History {...historyModel(history, now, histSel, knob)} />
        ) : (
          <theme.Timer
            {...timerModel(state, now, clockStatus, { holding, flash, bump, knob, trustClock, toggleHistory })}
          />
        )}
      </div>
      {view === 'settings' && <Settings picked={picked} current={themeId} onPick={applyTheme} />}
    </div>
  );
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
