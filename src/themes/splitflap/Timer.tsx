import { formatDrift, hhmm } from '../kit';
import type { Phase, TimerView } from '../types';
import { Flap, FlapText } from './Flap';

const DEST: Record<Phase, string> = { focus: 'FOCUS', short: 'SHORT BREAK', long: 'LONG BREAK' };
const ROW = { time: 5, dest: 11, dur: 4, status: 11 };
const ROW_LEN = ROW.time + ROW.dest + ROW.dur + ROW.status + 3;

function cols(...parts: [string, number][]) {
  return parts.map(([s, n]) => s.toUpperCase().padEnd(n).slice(0, n)).join(' ');
}

/**
 * An airport departures board. The countdown flips digit by digit; the
 * rows below are the coming phases with projected departure times.
 */
export default function Timer(v: TimerView) {
  const { now, today, clock } = v;
  const idle = v.mode === 'idle';
  const big = v.countdown;
  const lastCall = v.mode === 'running' && v.phase === 'focus' && v.minutesLeft <= 1;
  const status =
    v.mode === 'paused'
      ? 'DELAYED'
      : idle
        ? 'BOARDING'
        : lastCall
          ? 'LAST CALL'
          : v.phase === 'focus'
            ? 'ON TIME'
            : 'IN PROGRESS';

  const rows = v.schedule;
  const footer =
    clock.kind === 'behind'
      ? `CLOCK ${formatDrift(clock.behindMs)} BEHIND - SYNC PHONE`
      : clock.kind === 'unverified'
        ? `CLOCK UNSURE - TAP IF ${hhmm(now)} OK`
        : `TODAY ${today.sessions} FLIGHTS ${today.minutes}M  STREAK ${v.streak}D`;

  return (
    <div className={`board mode-${v.mode}${lastCall ? ' last-call' : ''}`}>
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
                [`${r.minutes}M`, ROW.dur],
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
        Turn: {idle ? 'set' : '±1 min'} · Press: {{ pause: 'hold gate', resume: 'resume', start: 'depart' }[v.actions.press]} ·
        Hold: {{ stop: 'cancel', skip: 'skip', reset: 'reset' }[v.actions.hold]} · 4: arrivals
      </p>
      <div key={v.flash} className={v.flash ? 'sf-flash' : ''} />
    </div>
  );
}
