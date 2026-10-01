import { formatDrift, formatDuration, hhmm, PHASE_LABEL } from '../kit';
import type { TimerView } from '../types';
import Dial from './Dial';

export default function Timer(v: TimerView) {
  const { now, endsAt, today, clock: clockStatus } = v;

  return (
    <div className={`app phase-${v.phase} mode-${v.mode}`}>
      <div className="glow" />
      <div key={v.flash} className={v.flash ? 'flash' : ''} />

      <div className="dial-wrap" {...v.knob}>
        <Dial minutes={v.leftMs / 60_000} holding={v.holding} />
        <div className="center">
          {v.mode === 'idle' ? (
            <>
              <div key={v.bump} className="big bump">
                {v.setMinutes}
              </div>
              <div className="unit">{v.setMinutes === 1 ? 'minute' : 'minutes'}</div>
            </>
          ) : (
            <>
              <div className="clock">{v.countdown}</div>
              <div className="unit">{v.mode === 'paused' ? 'paused' : PHASE_LABEL[v.phase]}</div>
            </>
          )}
        </div>
      </div>

      <aside className="panel">
        {clockStatus.kind === 'ok' ? (
          <div className="now">
            <span>{hhmm(now)}</span>
            <span className="ends">{v.mode === 'paused' ? 'on hold' : `ends ${hhmm(endsAt)}`}</span>
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
            {v.mode === 'idle' ? (v.phase === 'focus' ? 'Ready' : 'Up next') : 'Now'}
          </div>
          <h1>{PHASE_LABEL[v.phase]}</h1>
          <div className="dots">
            {v.set.map((d, i) => (
              <span key={i} className={`dot ${d}`} />
            ))}
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ transform: `scaleX(${v.mode === 'idle' ? 0 : v.progress})` }}
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
            {v.mode === 'idle' ? 'Turn to set time' : 'Turn to add or remove a minute'}
          </li>
          <li>
            <i className="ico ico-press" />
            {{ pause: 'Press to pause', resume: 'Press to resume', start: 'Press to start' }[v.actions.press]}
          </li>
          <li>
            <i className="ico ico-hold" />
            {{ stop: 'Hold to stop', skip: 'Hold to skip break', reset: 'Hold to reset set' }[v.actions.hold]}
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
