export type Phase = 'focus' | 'short' | 'long';
export type Mode = 'idle' | 'running' | 'paused';

export interface Settings {
  focus: number;
  short: number;
  long: number;
}

export interface TimerState {
  mode: Mode;
  phase: Phase;
  settings: Settings;
  /** Epoch ms when the running phase ends. Only meaningful while running. */
  endsAt: number;
  /** Ms left when paused. */
  remaining: number;
  /** Focus sessions finished in the current set of four. */
  cycle: number;
  /** Local date (YYYY-MM-DD) the `today*` counters belong to. */
  day: string;
  todaySessions: number;
  todayFocusMin: number;
}

export const SESSIONS_PER_SET = 4;
export const LIMITS: Record<Phase, [number, number]> = {
  focus: [1, 90],
  short: [1, 30],
  long: [5, 60],
};

export const PHASE_LABEL: Record<Phase, string> = {
  focus: 'Focus',
  short: 'Short break',
  long: 'Long break',
};

export function localDay(now: number): string {
  const d = new Date(now);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function initialState(now: number): TimerState {
  return {
    mode: 'idle',
    phase: 'focus',
    settings: { focus: 25, short: 5, long: 15 },
    endsAt: 0,
    remaining: 0,
    cycle: 0,
    day: localDay(now),
    todaySessions: 0,
    todayFocusMin: 0,
  };
}

export const phaseMs = (s: TimerState, phase: Phase = s.phase) => s.settings[phase] * 60_000;

/** Milliseconds left in the current phase at `now`. */
export function remainingMs(s: TimerState, now: number): number {
  if (s.mode === 'running') return Math.max(0, s.endsAt - now);
  if (s.mode === 'paused') return s.remaining;
  return phaseMs(s);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Roll the daily counters over when the local date changes. */
export function rollDay(s: TimerState, now: number): TimerState {
  const day = localDay(now);
  return day === s.day ? s : { ...s, day, todaySessions: 0, todayFocusMin: 0 };
}

/** Wheel turn: set the duration when idle, nudge the clock when active. */
export function turn(s: TimerState, steps: number, now: number): TimerState {
  if (steps === 0) return s;
  if (s.mode === 'idle') {
    const [lo, hi] = LIMITS[s.phase];
    const v = clamp(s.settings[s.phase] + steps, lo, hi);
    return { ...s, settings: { ...s.settings, [s.phase]: v } };
  }
  // Running or paused: add/remove whole minutes, never below one minute left.
  const left = remainingMs(s, now);
  const next = clamp(left + steps * 60_000, 60_000, 180 * 60_000);
  return s.mode === 'running' ? { ...s, endsAt: now + next } : { ...s, remaining: next };
}

/** Wheel press: start, pause or resume. */
export function press(s: TimerState, now: number): TimerState {
  switch (s.mode) {
    case 'idle':
      return { ...s, mode: 'running', endsAt: now + phaseMs(s) };
    case 'running':
      return { ...s, mode: 'paused', remaining: Math.max(0, s.endsAt - now) };
    case 'paused':
      return { ...s, mode: 'running', endsAt: now + s.remaining };
  }
}

/** Wheel hold: stop the active phase, or skip a waiting break. */
export function hold(s: TimerState): TimerState {
  if (s.mode !== 'idle') return { ...s, mode: 'idle' };
  if (s.phase !== 'focus') return { ...s, phase: 'focus' };
  return { ...s, cycle: 0 };
}

export function setPreset(s: TimerState, minutes: number): TimerState {
  if (s.mode !== 'idle') return s;
  const [lo, hi] = LIMITS[s.phase];
  return { ...s, settings: { ...s.settings, [s.phase]: clamp(minutes, lo, hi) } };
}

/**
 * Advance past a phase that has run out. Focus flows straight into its break;
 * a finished break waits idle so the next focus starts on purpose.
 */
export function complete(s: TimerState, now: number): TimerState {
  s = rollDay(s, now);
  if (s.phase === 'focus') {
    const cycle = s.cycle + 1;
    const phase: Phase = cycle >= SESSIONS_PER_SET ? 'long' : 'short';
    return {
      ...s,
      phase,
      mode: 'running',
      // Chain from the instant focus ended, not from when the tick noticed:
      // keeps the break exactly its length and never shows 05:01.
      endsAt: s.endsAt + phaseMs(s, phase),
      cycle,
      todaySessions: s.todaySessions + 1,
      todayFocusMin: s.todayFocusMin + s.settings.focus,
    };
  }
  return {
    ...s,
    phase: 'focus',
    mode: 'idle',
    cycle: s.phase === 'long' ? 0 : s.cycle,
  };
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
