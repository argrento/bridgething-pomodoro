export type Phase = 'focus' | 'short' | 'long';
export type Mode = 'idle' | 'running' | 'paused';

export interface Settings {
  focus: number;
  short: number;
  long: number;
}

/** One focus session, as kept in the on-device history. */
export interface HistoryEntry {
  /** Epoch ms the session started. */
  start: number;
  /** Epoch ms it ended (ran out or was stopped). */
  end: number;
  /** Time actually spent focusing: wall time minus pauses. */
  focusedMs: number;
  /** Ran to the end, as opposed to being stopped early. */
  done: boolean;
}

/** Stopped sessions shorter than this are not worth remembering. */
const MIN_LOGGED_MS = 60_000;
/** Roughly a year at eight sessions a day. */
export const HISTORY_CAP = 3000;

export interface TimerState {
  mode: Mode;
  phase: Phase;
  settings: Settings;
  /** Epoch ms when the running phase ends. Only meaningful while running. */
  endsAt: number;
  /** Ms left when paused. */
  remaining: number;
  /** Epoch ms the current phase started. */
  startedAt: number;
  /** Epoch ms the current pause began. Only meaningful while paused. */
  pausedAt: number;
  /** Ms spent paused in the current phase. */
  pausedTotal: number;
  /** Focus sessions finished in the current set of four. */
  cycle: number;
  /** Oldest first. */
  history: HistoryEntry[];
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
    startedAt: now,
    pausedAt: 0,
    pausedTotal: 0,
    cycle: 0,
    history: [],
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

function log(s: TimerState, entry: HistoryEntry): HistoryEntry[] {
  const history = [...s.history, entry];
  return history.length > HISTORY_CAP ? history.slice(-HISTORY_CAP) : history;
}

/** Focus time so far in the current phase, excluding pauses. */
function focusedSoFar(s: TimerState, now: number): number {
  const until = s.mode === 'paused' ? s.pausedAt : now;
  return Math.max(0, until - s.startedAt - s.pausedTotal);
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
      return { ...s, mode: 'running', endsAt: now + phaseMs(s), startedAt: now, pausedTotal: 0 };
    case 'running':
      return { ...s, mode: 'paused', remaining: Math.max(0, s.endsAt - now), pausedAt: now };
    case 'paused':
      return {
        ...s,
        mode: 'running',
        endsAt: now + s.remaining,
        pausedTotal: s.pausedTotal + (now - s.pausedAt),
      };
  }
}

/** Wheel hold: stop the active phase, or skip a waiting break. */
export function hold(s: TimerState, now: number): TimerState {
  if (s.mode !== 'idle') {
    const focusedMs = focusedSoFar(s, now);
    const history =
      s.phase === 'focus' && focusedMs >= MIN_LOGGED_MS
        ? log(s, { start: s.startedAt, end: s.mode === 'paused' ? s.pausedAt : now, focusedMs, done: false })
        : s.history;
    return { ...s, mode: 'idle', history };
  }
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
export function complete(s: TimerState): TimerState {
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
      startedAt: s.endsAt,
      pausedTotal: 0,
      cycle,
      history: log(s, {
        start: s.startedAt,
        end: s.endsAt,
        focusedMs: s.endsAt - s.startedAt - s.pausedTotal,
        done: true,
      }),
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

/** Sessions and focus minutes logged on the local day of `now`. */
export function dayTotals(history: HistoryEntry[], day: string) {
  let sessions = 0;
  let focusedMs = 0;
  for (const e of history) {
    if (localDay(e.start) !== day) continue;
    if (e.done) sessions++;
    focusedMs += e.focusedMs;
  }
  return { sessions, minutes: Math.round(focusedMs / 60_000) };
}

/** Consecutive days, ending today (or yesterday if today is still empty), with a finished session. */
export function streak(history: HistoryEntry[], now: number): number {
  const days = new Set(history.filter(e => e.done).map(e => localDay(e.start)));
  const d = new Date(now);
  if (!days.has(localDay(d.getTime()))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(localDay(d.getTime()))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/** Compact wire form for the store: [startSec, endSec, focusedSec, done]. */
export function encodeHistory(h: HistoryEntry[]): string {
  return JSON.stringify(
    h.map(e => [Math.round(e.start / 1000), Math.round(e.end / 1000), Math.round(e.focusedMs / 1000), e.done ? 1 : 0]),
  );
}

export function decodeHistory(json: string): HistoryEntry[] | null {
  try {
    const rows = JSON.parse(json) as number[][];
    if (!Array.isArray(rows)) return null;
    return rows.map(([a, b, c, d]) => ({ start: a * 1000, end: b * 1000, focusedMs: c * 1000, done: d === 1 }));
  } catch {
    return null;
  }
}
