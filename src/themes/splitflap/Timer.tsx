import { formatDrift } from '../../clock';
import { formatClock, hhmm, SESSIONS_PER_SET, type Phase, type TimerState } from '../../timer';
import type { TimerView } from '../types';
import { Flap, FlapText } from './Flap';

const DEST: Record<Phase, string> = { focus: 'FOCUS', short: 'SHORT BREAK', long: 'LONG BREAK' };
const ROW = { time: 5, dest: 11, dur: 4, status: 11 };
const ROW_LEN = ROW.time + ROW.dest + ROW.dur + ROW.status + 3;

/** The phase that follows `phase`, given how many focus sessions the set has done. */
function after(phase: Phase, cycle: number): { phase: Phase; cycle: number } {
  if (phase !== 'focus') return { phase: 'focus', cycle: phase === 'long' ? 0 : cycle };
  const done = cycle + 1;
  return { phase: done >= SESSIONS_PER_SET ? 'long' : 'short', cycle: done };
}

/** Current phase plus the next two, with the time each would depart. */
function departures(state: TimerState, now: number, endsAt: number) {
  const rows = [{ phase: state.phase, at: state.mode === 'idle' ? now : state.startedAt }];
  let p = state.phase;
  let cycle = state.cycle;
  let at = endsAt;
  for (let i = 0; i < 2; i++) {
    const n = after(p, cycle);
    rows.push({ phase: n.phase, at });
    at += state.settings[n.phase] * 60_000;
    p = n.phase;
    cycle = n.cycle;
  }
  return rows;
}

function cols(...parts: [string, number][]) {
  return parts.map(([s, n]) => s.toUpperCase().padEnd(n).slice(0, n)).join(' ');
}

/**
 * An airport departures board. The countdown flips digit by digit; the
 * rows below are the coming phases with projected departure times.
 */
export default function Timer(v: TimerView) {
  const { state, now, left, endsAt, today, clock } = v;
  const idle = state.mode === 'idle';
  const big = idle ? `${String(state.settings[state.phase]).padStart(2, '0')}:00` : formatClock(left);
  const lastCall = state.mode === 'running' && state.phase === 'focus' && left < 60_000;
  const status =
    state.mode === 'paused'
      ? 'DELAYED'
      : idle
        ? 'BOARDING'
        : lastCall
          ? 'LAST CALL'
          : state.phase === 'focus'
            ? 'ON TIME'
            : 'IN PROGRESS';

  const rows = departures(state, now, endsAt);
  const footer =
    clock.kind === 'behind'
      ? `CLOCK ${formatDrift(clock.behindMs)} BEHIND - SYNC PHONE`
      : clock.kind === 'unverified'
        ? `CLOCK UNSURE - TAP IF ${hhmm(now)} OK`
        : `TODAY ${today.sessions} FLIGHTS ${today.minutes}M  STREAK ${v.streak}D`;

  return (
    <div className={`board mode-${state.mode}${lastCall ? ' last-call' : ''}`}>
      <header className="sf-head">
        <span className="sf-title">
          <i className="plane" />
          Departures
        </span>
        <FlapText text={hhmm(now)} len={5} riffle={false} className="sf-clock" />
      </header>

      <div className="sf-big" {...v.knob}>
        {[...big].map((c, i) =>
          c === ':' ? (
            <span key={`c${i}`} className="sf-colon">
              <i />
              <i />
            </span>
          ) : (
            <Flap key={`${big.length}-${i}`} ch={c} riffle={false} className="big" />
          ),
        )}
      </div>

      <div className="sf-table">
        <div className="sf-labels">
          <span style={{ width: `${(ROW.time + 1) * 21}px` }}>Time</span>
          <span style={{ width: `${(ROW.dest + 1) * 21}px` }}>Destination</span>
          <span style={{ width: `${(ROW.dur + 1) * 21}px` }}>Dur</span>
          <span>Status</span>
        </div>
        {rows.map((r, i) => (
          <div key={i} className={`sf-row${i === 0 ? ' now' : ''}`}>
            <FlapText
              text={cols(
                [hhmm(r.at), ROW.time],
                [DEST[r.phase], ROW.dest],
                [`${state.settings[r.phase]}M`, ROW.dur],
                [i === 0 ? status : 'SCHEDULED', ROW.status],
              )}
              len={ROW_LEN}
            />
          </div>
        ))}
      </div>

      <div
        className={`sf-footer${clock.kind !== 'ok' ? ' warn' : ''}`}
        onClick={clock.kind === 'unverified' ? v.trustClock : v.toggleHistory}
      >
        <FlapText text={footer} len={ROW_LEN} />
      </div>

      <div className={`sf-hold${v.holding ? ' on' : ''}`} />
      <p className="sf-hints">
        Turn: {idle ? 'set' : '±1 min'} · Press: {state.mode === 'running' ? 'hold gate' : state.mode === 'paused' ? 'resume' : 'depart'} ·
        Hold: {!idle ? 'cancel' : state.phase !== 'focus' ? 'skip' : 'reset'} · 4: arrivals
      </p>
      <div key={v.flash} className={v.flash ? 'sf-flash' : ''} />
    </div>
  );
}
