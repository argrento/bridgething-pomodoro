import { formatDrift, formatDuration, hhmm } from '../kit';
import type { TimerView } from '../types';
import { Bargraph, Lamp, TubeRow } from './parts';

const PRESS = { start: 'start', pause: 'pause', resume: 'resume' } as const;
const HOLD = { stop: 'stop', skip: 'skip', reset: 'reset' } as const;

/**
 * Nixie instrument panel: the countdown in IN-14 tubes, an IN-9 bargraph
 * for the time left, and neon indicator lamps for phase and set.
 */
export default function Timer(v: TimerView) {
  const running = v.mode === 'running';
  const tick = running && Math.floor(v.now / 500) % 2 === 0;

  return (
    <div className={`panel mode-${v.mode}`}>
      <div className="tube-bay" {...v.knob}>
        <TubeRow text={v.countdown} blink={running && !tick} />
      </div>

      <div className="graph-row">
        <span className="plate small">0</span>
        <Bargraph frac={v.mode === 'idle' ? 1 : 1 - v.progress} />
        <span className="plate small">{v.setMinutes}′</span>
      </div>

      <div className="lamps">
        <div className="lamp-group">
          <Lamp state={v.phase === 'focus' ? 'on' : 'off'} label="Focus" />
          <Lamp state={v.phase === 'short' ? 'on' : 'off'} label="Break" />
          <Lamp state={v.phase === 'long' ? 'on' : 'off'} label="Long" />
          <Lamp state={v.mode === 'paused' ? 'blink' : 'off'} label="Hold" />
        </div>
        <div className="lamp-group set">
          {v.set.map((s, i) => (
            <Lamp key={i} state={s === 'done' ? 'on' : s === 'live' ? 'blink' : 'off'} />
          ))}
          <span className="plate">Set</span>
        </div>
        <div className="readout" onClick={v.toggleHistory}>
          <span className="plate">{v.mode === 'running' ? 'Ends' : 'Would end'}</span>
          <span className="engraved">{v.mode === 'paused' ? '——' : hhmm(v.endsAt)}</span>
          <span className="plate">Today</span>
          <span className="engraved">
            {v.today.sessions} · {formatDuration(v.today.minutes)}
          </span>
        </div>
      </div>

      {v.clock.kind !== 'ok' ? (
        <div className="warning" onClick={v.clock.kind === 'unverified' ? v.trustClock : undefined}>
          <Lamp state="warn" />
          <span className="plate wide">
            {v.clock.kind === 'behind'
              ? `Clock ${formatDrift(v.clock.behindMs)} behind — connect phone`
              : `Clock unverified — tap if ${hhmm(v.now)} is right`}
          </span>
        </div>
      ) : (
        <div className="legend">
          <span className="plate">Turn · {v.actions.turn === 'set' ? 'set' : '±1 min'}</span>
          <span className="plate">Press · {PRESS[v.actions.press]}</span>
          <span className="plate">Hold · {HOLD[v.actions.hold]}</span>
          <span className="plate">4 · log</span>
        </div>
      )}

      <div className={`hold-glow${v.holding ? ' on' : ''}`} />
      <div key={v.flash} className={v.flash ? 'strike' : ''} />
    </div>
  );
}
