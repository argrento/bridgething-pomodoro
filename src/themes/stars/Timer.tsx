import { useRef } from 'react';
import { formatDrift, hhmm } from '../kit';
import type { TimerView } from '../types';
import Sky, { CRUISE } from './Sky';

/**
 * Flight through a starfield. Working is warping: starting a focus session
 * jumps to lightspeed and settles into a cruise. Resting is charging:
 * finishing one drops out of warp and parks by a warm star, the stars hold
 * still and a charge bar fills over the break. Only the countdown sits on top.
 */
export default function Timer(v: TimerView) {
  const prevMode = useRef(v.mode);
  const prevFlash = useRef(v.flash);
  const jumps = useRef(0);
  const drops = useRef(0);

  if (prevMode.current === 'idle' && v.mode === 'running' && v.phase === 'focus') jumps.current++;
  if (v.flash !== prevFlash.current && v.phase !== 'focus') drops.current++;
  prevMode.current = v.mode;
  prevFlash.current = v.flash;

  const resting = v.phase !== 'focus';
  const speed = v.mode === 'running' && !resting ? CRUISE : 0;
  const quiet = v.holding ? ' holding' : v.mode === 'paused' ? ' paused' : '';

  return (
    <div className={`stars${resting ? ' resting' : ''}`} {...v.knob}>
      <Sky speed={speed} jump={jumps.current} drop={drops.current}>
        <div className="sun" />
        <div className="stars-ui">
          <div className={`status${v.mode === 'running' ? ' on' : ''}`}>{resting ? 'Recharging' : 'Cruising'}</div>
          <div className={`count${quiet}`}>
            {[...v.countdown].map((c, i) => (
              <span key={i} className={c === ':' ? 'colon' : undefined}>
                {c}
              </span>
            ))}
          </div>
          {resting ? (
            <div className="charge">
              <i style={{ width: `${v.progress * 100}%` }} />
            </div>
          ) : (
            <div className="set">
              {v.set.map((s, i) => (
                <i key={i} className={s} />
              ))}
            </div>
          )}
        </div>
        {v.clock.kind !== 'ok' && (
          <div className="note" onClick={v.clock.kind === 'unverified' ? v.trustClock : undefined}>
            {v.clock.kind === 'behind'
              ? `Clock ${formatDrift(v.clock.behindMs)} behind · connect phone`
              : `Clock unverified · tap if ${hhmm(v.now)} is right`}
          </div>
        )}
      </Sky>
    </div>
  );
}
