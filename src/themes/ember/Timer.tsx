import { formatDrift } from '../../clock';
import { formatClock, formatDuration, hhmm, PHASE_LABEL, phaseMs, SESSIONS_PER_SET } from '../../timer';
import type { TimerView } from '../types';
import Dial from './Dial';

export default function Timer(v: TimerView) {
  const { state, now, left, endsAt, today, clock: clockStatus } = v;
  const total = Math.max(phaseMs(state), left);
  const dots = Array.from({ length: SESSIONS_PER_SET }, (_, i) => {
    if (i < state.cycle) return 'done';
    if (i === state.cycle && state.phase === 'focus' && state.mode !== 'idle') return 'live';
    return '';
  });

  return (
    <div className={`app phase-${state.phase} mode-${state.mode}`}>
      <div className="glow" />
      <div key={v.flash} className={v.flash ? 'flash' : ''} />

      <div className="dial-wrap" {...v.knob}>
        <Dial minutes={left / 60_000} holding={v.holding} />
        <div className="center">
          {state.mode === 'idle' ? (
            <>
              <div key={v.bump} className="big bump">
                {state.settings[state.phase]}
              </div>
              <div className="unit">{state.settings[state.phase] === 1 ? 'minute' : 'minutes'}</div>
            </>
          ) : (
            <>
              <div className="clock">{formatClock(left)}</div>
              <div className="unit">{state.mode === 'paused' ? 'paused' : PHASE_LABEL[state.phase]}</div>
            </>
          )}
        </div>
      </div>

      <aside className="panel">
        {clockStatus.kind === 'ok' ? (
          <div className="now">
            <span>{hhmm(now)}</span>
            <span className="ends">{state.mode === 'paused' ? 'on hold' : `ends ${hhmm(endsAt)}`}</span>
          </div>
        ) : (
          <div
            className={`clock-warn ${clockStatus.kind}`}
            onClick={clockStatus.kind === 'unverified' ? v.trustClock : undefined}
          >
            <i className="warn-ico">!</i>
            <div>
              <b>
                {clockStatus.kind === 'behind'
                  ? `Clock is ${formatDrift(clockStatus.behindMs)} behind`
                  : `Clock may be wrong · ${hhmm(now)}`}
              </b>
              <span>
                {clockStatus.kind === 'behind'
                  ? 'History dates will be off. Connect phone to sync.'
                  : 'Device was powered off. Tap if the time is right.'}
              </span>
            </div>
          </div>
        )}

        <div className="phase">
          <div className="eyebrow">
            {state.mode === 'idle' ? (state.phase === 'focus' ? 'Ready' : 'Up next') : 'Now'}
          </div>
          <h1>{PHASE_LABEL[state.phase]}</h1>
          <div className="dots">
            {dots.map((d, i) => (
              <span key={i} className={`dot ${d}`} />
            ))}
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ transform: `scaleX(${state.mode === 'idle' ? 0 : 1 - left / total})` }}
            />
          </div>
        </div>

        <div className="today" onClick={v.toggleHistory}>
          <div>
            <b>{today.sessions}</b>
            <span>{today.sessions === 1 ? 'session' : 'sessions'}</span>
          </div>
          <div>
            <b>{formatDuration(today.minutes)}</b>
            <span>focused today</span>
          </div>
        </div>

        <ul className="hints">
          <li>
            <i className="ico ico-turn" />
            {state.mode === 'idle' ? 'Turn to set time' : 'Turn to add or remove a minute'}
          </li>
          <li>
            <i className="ico ico-press" />
            {state.mode === 'running' ? 'Press to pause' : state.mode === 'paused' ? 'Press to resume' : 'Press to start'}
          </li>
          <li>
            <i className="ico ico-hold" />
            {state.mode !== 'idle' ? 'Hold to stop' : state.phase !== 'focus' ? 'Hold to skip break' : 'Hold to reset set'}
          </li>
          <li>
            <i className="ico ico-key">4</i>
            History
            <i className="ico ico-key">M</i>
            Design
          </li>
        </ul>
      </aside>
    </div>
  );
}
