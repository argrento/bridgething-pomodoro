import { formatDrift, formatDuration, hhmm } from '../kit';
import type { TimerView } from '../types';
import Campfire from './Campfire';
import { figlet } from './figlet';

/** How hot the fire burns for the current state. */
function fireLevel(v: TimerView): number {
  if (v.mode === 'paused') return 0.14;
  if (v.mode === 'idle') return v.phase === 'focus' ? 0 : 0.16;
  if (v.phase !== 'focus') return 0.16;
  return 0.3 + 0.7 * (1 - v.progress);
}

function message(v: TimerView): string {
  if (v.clock.kind === 'behind') return `/!\\ clock is ${formatDrift(v.clock.behindMs)} behind. connect the phone.`;
  if (v.clock.kind === 'unverified') return `/!\\ clock may be wrong. tap here if ${hhmm(v.now)} is right.`;
  if (v.mode === 'paused') return 'the fire smoulders... press to stoke it.';
  if (v.mode === 'running') {
    return v.phase === 'focus'
      ? `keep the fire going. it burns out at ${hhmm(v.endsAt)}.`
      : `rest by the embers. back to work at ${hhmm(v.endsAt)}.`;
  }
  return v.phase === 'focus' ? 'the logs are stacked. press to light the fire.' : 'the fire burned down. press to rest by the embers.';
}

const PRESS = { start: 'light', pause: 'bank', resume: 'stoke' } as const;
const HOLD = { stop: 'douse', skip: 'skip', reset: 'reset' } as const;
const HOLDING = { stop: 'dousing the fire', skip: 'skipping the break', reset: 'resetting the set' } as const;

/**
 * A campfire at night, all in ASCII. The fire burns lower as the focus
 * time runs out; breaks are embers under the stars.
 */
export default function Timer(v: TimerView) {
  const slots = v.set.map(s => (s === 'done' ? '[#]' : s === 'live' ? '[>]' : '[ ]')).join('');
  const smoke = v.mode === 'paused' || (v.mode === 'idle' && v.phase === 'focus');

  return (
    <div className={`night mode-${v.mode} phase-${v.phase}`} {...v.knob}>
      <Campfire level={fireLevel(v)} smoke={smoke} burst={v.flash} />

      <pre className="countdown">{figlet(v.countdown)}</pre>

      <pre className="corner left">
        {`.-[ ${v.phase === 'focus' ? 'focus' : v.phase === 'short' ? 'break' : 'long break'} ]-\n| set ${slots}\n'--------------------`}
      </pre>
      <pre className="corner right" onClick={v.toggleHistory}>
        {`today  ${v.today.sessions} logs, ${formatDuration(v.today.minutes)}\nstreak ${v.streak} ${v.streak === 1 ? 'night' : 'nights'}\nends   ${v.mode === 'paused' ? '--:--' : hhmm(v.endsAt)}`}
      </pre>

      <pre
        className={`message${v.clock.kind !== 'ok' ? ' warn' : ''}`}
        onPointerDown={e => v.clock.kind === 'unverified' && e.stopPropagation()}
        onClick={v.clock.kind === 'unverified' ? v.trustClock : undefined}
      >
        {v.holding ? (
          <>
            {HOLDING[v.actions.hold]} [<span className="hold-fill">##########</span>]
          </>
        ) : (
          message(v)
        )}
      </pre>
      <pre className="hints">
        {`turn: ${v.actions.turn === 'set' ? 'set minutes' : '+/- 1 min'} | press: ${PRESS[v.actions.press]} | hold: ${HOLD[v.actions.hold]} | 4: woodpile`}
      </pre>
    </div>
  );
}
