import type { FC, PointerEventHandler } from 'react';
import type { ClockStatus } from '../clock';
import type { HistoryEntry, TimerState } from '../timer';

/** Handlers that make an element behave like the knob: tap, or press and hold. */
export interface KnobBinds {
  onPointerDown: PointerEventHandler;
  onPointerUp: PointerEventHandler;
  onPointerLeave: PointerEventHandler;
}

/** Everything a theme needs to draw the timer screen. Themes render; they never own state. */
export interface TimerView {
  state: TimerState;
  now: number;
  /** Ms left in the current phase. */
  left: number;
  /** Epoch ms the phase ends (or would end, if started now). */
  endsAt: number;
  today: { sessions: number; minutes: number };
  streak: number;
  history: HistoryEntry[];
  clock: ClockStatus;
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

export interface HistoryView {
  history: HistoryEntry[];
  now: number;
  /** Days back from today. */
  selected: number;
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
