import type { TimerView } from '../types';

/**
 * A focus session flown as one leg. Pure functions of the view model:
 * which phase of flight we are in, what the engines read, what the flight
 * mode annunciator and the memos say.
 */
export type Phase =
  | 'ground'
  | 'takeoff'
  | 'climb'
  | 'cruise'
  | 'descent'
  | 'approach'
  | 'flare'
  | 'landed'
  | 'parked'
  | 'cold';

export function phaseOf(v: TimerView): Phase {
  if (v.phase !== 'focus') {
    if (v.mode === 'idle') return 'landed';
    return v.phase === 'long' ? 'cold' : 'parked';
  }
  if (v.mode === 'idle') return 'ground';
  const elapsed = v.totalMs - v.leftMs;
  if (v.leftMs <= 30_000) return 'flare';
  if (v.leftMs <= 120_000) return 'approach';
  if (elapsed < 60_000 && v.progress < 0.1) return 'takeoff';
  if (v.leftMs <= 300_000) return 'descent';
  if (v.progress < 0.2) return 'climb';
  return 'cruise';
}

/** N1 %, EGT °C, N2 %, fuel flow kg/h per engine. */
export interface Engine {
  n1: number;
  egt: number;
  n2: number;
  ff: number;
  running: boolean;
}
const ENG: Record<Phase, Engine> = {
  ground: { n1: 19.5, egt: 410, n2: 58.8, ff: 300, running: true },
  takeoff: { n1: 92.3, egt: 782, n2: 97.2, ff: 3260, running: true },
  climb: { n1: 86.4, egt: 701, n2: 93.4, ff: 2410, running: true },
  cruise: { n1: 82.1, egt: 633, n2: 90.6, ff: 1180, running: true },
  descent: { n1: 24.6, egt: 452, n2: 61.8, ff: 340, running: true },
  approach: { n1: 46.2, egt: 528, n2: 74.1, ff: 720, running: true },
  flare: { n1: 22.0, egt: 470, n2: 60.2, ff: 330, running: true },
  landed: { n1: 19.8, egt: 418, n2: 59.0, ff: 300, running: true },
  parked: { n1: 0, egt: 112, n2: 0, ff: 0, running: false },
  cold: { n1: 0, egt: 24, n2: 0, ff: 0, running: false },
};
/** Engines read the phase's values with a small live flutter, so the digits breathe. */
export function engine(phase: Phase, side: 0 | 1, now: number): Engine {
  const e = ENG[phase];
  if (!e.running) return e;
  const w = Math.sin(now / 900 + side * 2.1) * 0.15;
  return { ...e, n1: e.n1 + w, egt: e.egt + w * 6, n2: e.n2 + w * 0.6, ff: e.ff + Math.round(w * 40) };
}

/** Thrust limit mode and N1 limit, top right of the display. */
export const THRUST_LIMIT: Record<Phase, [string, number] | null> = {
  ground: ['TOGA', 92.3],
  takeoff: ['TOGA', 92.3],
  climb: ['CLB', 86.4],
  cruise: ['CLB', 86.4],
  descent: ['CLB', 86.4],
  approach: ['TOGA', 92.3],
  flare: ['TOGA', 92.3],
  landed: ['TOGA', 92.3],
  parked: null,
  cold: null,
};

export type Tone = 'green' | 'cyan' | 'white' | 'amber' | 'magenta';
export interface Cell {
  text: string;
  tone: Tone;
  armed?: string;
}
/** Flight mode annunciator: thrust · vertical · lateral · approach · engagement. */
export function fma(phase: Phase, paused: boolean): Cell[] {
  const cells: Record<Phase, Cell[]> = {
    ground: [{ text: '', tone: 'green' }, { text: '', tone: 'green' }, { text: '', tone: 'green' }, { text: '', tone: 'white' }, { text: '1FD2', tone: 'white', armed: 'A/THR' }],
    takeoff: [{ text: 'MAN TOGA', tone: 'white' }, { text: 'SRS', tone: 'green', armed: 'CLB' }, { text: 'RWY', tone: 'green', armed: 'NAV' }, { text: '', tone: 'white' }, { text: '1FD2', tone: 'white', armed: 'A/THR' }],
    climb: [{ text: 'THR CLB', tone: 'green' }, { text: 'OP CLB', tone: 'green' }, { text: 'NAV', tone: 'green' }, { text: '', tone: 'white' }, { text: 'AP1', tone: 'white', armed: 'A/THR' }],
    cruise: [{ text: 'SPEED', tone: 'green' }, { text: 'ALT CRZ', tone: 'green' }, { text: 'NAV', tone: 'green' }, { text: '', tone: 'white' }, { text: 'AP1', tone: 'white', armed: 'A/THR' }],
    descent: [{ text: 'THR IDLE', tone: 'green' }, { text: 'DES', tone: 'green', armed: 'G/S' }, { text: 'NAV', tone: 'green', armed: 'LOC' }, { text: '', tone: 'white' }, { text: 'AP1', tone: 'white', armed: 'A/THR' }],
    approach: [{ text: 'SPEED', tone: 'green' }, { text: 'G/S', tone: 'green' }, { text: 'LOC', tone: 'green' }, { text: 'CAT 3 DUAL', tone: 'white' }, { text: 'AP1+2', tone: 'white', armed: 'A/THR' }],
    flare: [{ text: '', tone: 'green' }, { text: 'FLARE', tone: 'green' }, { text: 'FLARE', tone: 'green' }, { text: 'CAT 3 DUAL', tone: 'white' }, { text: 'AP1+2', tone: 'white' }],
    landed: [{ text: '', tone: 'green' }, { text: 'ROLL OUT', tone: 'green' }, { text: 'ROLL OUT', tone: 'green' }, { text: '', tone: 'white' }, { text: '1FD2', tone: 'white' }],
    parked: [{ text: '', tone: 'green' }, { text: '', tone: 'green' }, { text: '', tone: 'green' }, { text: '', tone: 'white' }, { text: '', tone: 'white' }],
    cold: [{ text: '', tone: 'green' }, { text: '', tone: 'green' }, { text: '', tone: 'green' }, { text: '', tone: 'white' }, { text: '', tone: 'white' }],
  };
  const row = cells[phase].map(c => ({ ...c }));
  if (paused) row[0] = { text: 'THR LK', tone: 'amber' };
  return row;
}

export interface MemoLine {
  text: string;
  tone: Tone;
}
/** Left memo column: the checklist the phase calls for. */
export function memo(phase: Phase, v: TimerView): MemoLine[] {
  const left = v.leftMs;
  const done = (secondsBeforeEnd: number) => left <= secondsBeforeEnd * 1000;
  switch (phase) {
    case 'ground':
      return [
        { text: 'T.O AUTO BRK MAX', tone: 'green' },
        { text: '    SIGNS ON', tone: 'green' },
        { text: '    SPLRS ARM', tone: 'green' },
        { text: '    FLAPS T.O', tone: 'green' },
        { text: '    T.O CONFIG NORM', tone: 'green' },
      ];
    case 'takeoff':
    case 'climb':
      return [
        { text: 'SEAT BELTS', tone: 'green' },
        { text: 'GND SPLRS ARMED', tone: 'green' },
      ];
    case 'cruise':
      return [{ text: 'NO SMOKING', tone: 'green' }];
    case 'descent':
    case 'approach':
    case 'flare':
      return [
        { text: 'LDG GEAR DN', tone: done(150) ? 'green' : 'cyan' },
        { text: '    SIGNS ON', tone: done(200) ? 'green' : 'cyan' },
        { text: '    SPLRS ARM', tone: done(120) ? 'green' : 'cyan' },
        { text: '    FLAPS FULL', tone: done(60) ? 'green' : 'cyan' },
      ];
    case 'landed':
      return [{ text: 'TAXI', tone: 'green' }, { text: 'PARK BRK OFF', tone: 'green' }];
    case 'parked':
      return [{ text: 'PARK BRK', tone: 'green' }, { text: 'APU AVAIL', tone: 'green' }, { text: 'ENG 1+2 OFF', tone: 'green' }];
    case 'cold':
      return [{ text: 'COLD AND DARK', tone: 'green' }, { text: 'APU OFF', tone: 'green' }];
  }
}

/** Right memo column: inhibits and status. */
export function special(phase: Phase): MemoLine[] {
  if (phase === 'ground') return [{ text: 'T.O RDY', tone: 'green' }];
  if (phase === 'takeoff') return [{ text: 'T.O INHIBIT', tone: 'magenta' }];
  if (phase === 'approach' || phase === 'flare') return [{ text: 'LDG INHIBIT', tone: 'magenta' }];
  if (phase === 'parked') return [{ text: 'TURNAROUND', tone: 'green' }];
  return [];
}

/** The leg's flight phase name, shown small under the countdown. */
export const PHASE_NAME: Record<Phase, string> = {
  ground: 'PREFLIGHT',
  takeoff: 'TAKEOFF',
  climb: 'CLIMB',
  cruise: 'CRUISE',
  descent: 'DESCENT',
  approach: 'APPROACH',
  flare: 'LANDING',
  landed: 'TAXI IN',
  parked: 'TURNAROUND',
  cold: 'OVERNIGHT',
};
