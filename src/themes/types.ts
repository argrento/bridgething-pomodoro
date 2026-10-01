import type { FC, PointerEventHandler } from 'react';
import type { ClockStatus } from '../clock';
import type { Mode, Phase } from '../timer';

/**
 * The contract between the app and its designs.
 *
 * A theme receives a fully derived, read-only view model and only draws it.
 * It never sees TimerState or the raw history, so no design depends on how
 * the timer, the set, the schedule or the statistics are computed. Wording
 * is the theme's own: the model says *what* (e.g. action `pause`), the theme
 * decides how to say it ("Press to pause", "RET pause", "HOLD GATE").
 */

export type { ClockStatus, Mode, Phase };

/** Handlers that make an element behave like the knob: tap, or press and hold. */
export interface KnobBinds {
  onPointerDown: PointerEventHandler;
  onPointerUp: PointerEventHandler;
  onPointerLeave: PointerEventHandler;
}

/** One focus session from the log. */
export interface Session {
  start: number;
  end: number;
  /** Focused minutes, pauses excluded, rounded. */
  minutes: number;
  /** Ran to the end rather than being stopped. */
  done: boolean;
}

/** A slot in the current set of focus sessions. */
export type Slot = 'done' | 'live' | 'todo';

/** A phase on the timeline: the current one, then what follows. */
export interface Stop {
  phase: Phase;
  /** Epoch ms it starts (projected for future phases). */
  at: number;
  minutes: number;
}

/** What each knob gesture does right now. */
export interface Actions {
  turn: 'set' | 'adjust';
  press: 'start' | 'pause' | 'resume';
  hold: 'stop' | 'skip' | 'reset';
}

export interface TimerView {
  now: number;
  phase: Phase;
  mode: Mode;
  /** Minutes set for the current phase (what the wheel changes when idle). */
  setMinutes: number;
  /** Minutes per focus session. */
  focusMinutes: number;
  /** Ms left; equals the full phase while idle. */
  leftMs: number;
  /** Full length of the phase in ms (grows if minutes are added). */
  totalMs: number;
  /** 0 → 1 as the phase elapses; 0 while idle. */
  progress: number;
  /** "MM:SS"; "MM:00" while idle; "H:MM" once minutes exceed 99. */
  countdown: string;
  /** Whole minutes left, rounded up. */
  minutesLeft: number;
  /** Seconds left, rounded up (meaningful in the last minute). */
  secondsLeft: number;
  /** Epoch ms the phase ends, or would end if started now. */
  endsAt: number;
  /** The set of four, in order. */
  set: Slot[];
  /** Focus sessions finished in the current set. */
  cycle: number;
  /** Current phase and the next two. */
  schedule: Stop[];
  today: { sessions: number; minutes: number };
  /** Consecutive days with a finished session. */
  streak: number;
  /** Latest sessions, oldest first. */
  recent: Session[];
  clock: ClockStatus;
  actions: Actions;

  /** Knob is being held toward a stop/skip/reset. */
  holding: boolean;
  /** Increments when a phase completes; key an element on it to replay an effect. */
  flash: number;
  /** Increments on each wheel detent. */
  bump: number;
  knob: KnobBinds;
  trustClock: () => void;
  toggleHistory: () => void;
}

/** One day in the history window. */
export interface Day {
  date: Date;
  /** Days back from today (0 = today). */
  back: number;
  minutes: number;
  sessions: number;
  selected: boolean;
}

export interface HistoryView {
  now: number;
  /** Seven days, oldest first. */
  days: Day[];
  selected: Day;
  /** The selected day's sessions, newest first. */
  sessions: Session[];
  week: { minutes: number; sessions: number; best: Day | null; maxMinutes: number };
  streak: number;
  /** 0 for the current week, 1 for the one before, … */
  weeksAgo: number;
  knob: KnobBinds;
}

export interface Theme {
  id: string;
  name: string;
  blurb: string;
  /** Swatch for the picker: background, ink. */
  swatch: [string, string];
  Timer: FC<TimerView>;
  History: FC<HistoryView>;
}
