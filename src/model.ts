import type { ClockStatus } from './clock';
import type { Actions, Day, HistoryView, KnobBinds, Session, Slot, Stop, TimerView } from './themes/types';
import {
  dayTotals,
  formatClock,
  localDay,
  phaseMs,
  remainingMs,
  SESSIONS_PER_SET,
  streak,
  type HistoryEntry,
  type Phase,
  type TimerState,
} from './timer';

/** Everything derived for drawing lives here, so themes only present it. */

const DAYS = 7;

const session = (e: HistoryEntry): Session => ({
  start: e.start,
  end: e.end,
  minutes: Math.round(e.focusedMs / 60_000),
  done: e.done,
});

/** MM:SS, or H:MM once the minutes no longer fit two digits. */
function countdown(ms: number): string {
  const totalS = Math.ceil(ms / 1000);
  if (totalS < 100 * 60) return formatClock(ms);
  const min = Math.floor(totalS / 60);
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
}

/** The phase that follows `phase`, given focus sessions done in the set. */
function after(phase: Phase, cycle: number): { phase: Phase; cycle: number } {
  if (phase !== 'focus') return { phase: 'focus', cycle: phase === 'long' ? 0 : cycle };
  const done = cycle + 1;
  return { phase: done >= SESSIONS_PER_SET ? 'long' : 'short', cycle: done };
}

function schedule(s: TimerState, now: number, endsAt: number): Stop[] {
  const stops: Stop[] = [{ phase: s.phase, at: s.mode === 'idle' ? now : s.startedAt, minutes: s.settings[s.phase] }];
  let { phase, cycle } = s;
  let at = endsAt;
  for (let i = 0; i < 2; i++) {
    ({ phase, cycle } = after(phase, cycle));
    stops.push({ phase, at, minutes: s.settings[phase] });
    at += s.settings[phase] * 60_000;
  }
  return stops;
}

function actions(s: TimerState): Actions {
  return {
    turn: s.mode === 'idle' ? 'set' : 'adjust',
    press: s.mode === 'running' ? 'pause' : s.mode === 'paused' ? 'resume' : 'start',
    hold: s.mode !== 'idle' ? 'stop' : s.phase !== 'focus' ? 'skip' : 'reset',
  };
}

export interface Interaction {
  holding: boolean;
  flash: number;
  bump: number;
  knob: KnobBinds;
  trustClock: () => void;
  toggleHistory: () => void;
}

export function timerModel(
  s: TimerState,
  now: number,
  clock: ClockStatus,
  ui: Interaction,
): TimerView {
  const idle = s.mode === 'idle';
  const leftMs = remainingMs(s, now);
  const totalMs = Math.max(phaseMs(s), leftMs);
  const endsAt = s.mode === 'running' ? s.endsAt : now + leftMs;
  const set: Slot[] = Array.from({ length: SESSIONS_PER_SET }, (_, i) =>
    i < s.cycle ? 'done' : i === s.cycle && s.phase === 'focus' && !idle ? 'live' : 'todo',
  );
  return {
    now,
    phase: s.phase,
    mode: s.mode,
    setMinutes: s.settings[s.phase],
    focusMinutes: s.settings.focus,
    leftMs,
    totalMs,
    progress: idle ? 0 : 1 - leftMs / totalMs,
    countdown: idle ? `${String(s.settings[s.phase]).padStart(2, '0')}:00` : countdown(leftMs),
    minutesLeft: Math.ceil(leftMs / 60_000),
    secondsLeft: Math.ceil(leftMs / 1000),
    endsAt,
    set,
    // saved states from before the long-break fix may hold more than a full set
    cycle: Math.min(s.cycle, SESSIONS_PER_SET),
    schedule: schedule(s, now, endsAt),
    today: dayTotals(s.history, localDay(now)),
    streak: streak(s.history, now),
    recent: s.history.slice(-5).map(session),
    clock,
    actions: actions(s),
    ...ui,
  };
}

function dayStart(now: number, back: number): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - back);
  return d;
}

/** Seven days ending at the newest day that keeps `selected` (days back) on screen. */
export function historyModel(history: HistoryEntry[], now: number, selected: number, knob: KnobBinds): HistoryView {
  const weeksAgo = Math.floor(selected / DAYS);
  const days: Day[] = Array.from({ length: DAYS }, (_, i) => {
    const back = weeksAgo * DAYS + DAYS - 1 - i;
    const date = dayStart(now, back);
    return { date, back, ...dayTotals(history, localDay(date.getTime())), selected: back === selected };
  });
  const sel = days.find(d => d.selected)!;
  const busiest = days.reduce((a, d) => (d.minutes > a.minutes ? d : a), days[0]);
  return {
    now,
    days,
    selected: sel,
    sessions: history
      .filter(e => localDay(e.start) === localDay(sel.date.getTime()))
      .reverse()
      .map(session),
    week: {
      minutes: days.reduce((a, d) => a + d.minutes, 0),
      sessions: days.reduce((a, d) => a + d.sessions, 0),
      best: busiest.minutes > 0 ? busiest : null,
      maxMinutes: busiest.minutes,
    },
    streak: streak(history, now),
    weeksAgo,
    knob,
  };
}
