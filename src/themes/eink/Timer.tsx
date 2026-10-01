import { formatDrift, formatDuration, hhmm, PHASE_LABEL } from '../kit';
import { useEffect, useRef, useState } from 'react';
import type { TimerView } from '../types';

export default function Timer(v: TimerView) {
  const { now, endsAt, today, clock: clockStatus } = v;
  // E-ink pacing: the numeral changes once a minute; seconds only in the last one.
  const idle = v.mode === 'idle';
  const setMin = v.setMinutes;
  const lastMinute = !idle && v.minutesLeft <= 1;
  const big = idle ? setMin : lastMinute ? v.secondsLeft : v.minutesLeft;
  const remainingMin = idle ? setMin : v.minutesLeft;
  const dotCount = Math.min(90, Math.max(setMin, remainingMin));

  return (
    <div className={`page phase-${v.phase} mode-${v.mode}`}>
      <header className="masthead">
        <span className="sc">Pomodoro</span>
        <span className="tnum">{hhmm(now)}</span>
      </header>

      <main className="leaf" {...v.knob}>
        <div className="kicker">
          {PHASE_LABEL[v.phase]}
          {v.mode === 'paused' && <em> — paused</em>}
          {idle && v.phase !== 'focus' && <em> — up next</em>}
        </div>
        <div className="numeral">
          <Ghost value={big} />
          <span className="ink">{big}</span>
        </div>
        <div className="caption">
          {lastMinute
            ? 'seconds remaining'
            : idle
              ? `${setMin === 1 ? 'minute' : 'minutes'} of ${v.phase === 'focus' ? 'focus' : 'rest'}`
              : `${remainingMin === 1 ? 'minute' : 'minutes'} remaining`}
        </div>
        <div className={`hold-rule${v.holding ? ' on' : ''}`} />
        <div className="minutes" aria-label={`${remainingMin} of ${dotCount} minutes`}>
          {Array.from({ length: dotCount }, (_, i) => (
            <i key={i} className={i < remainingMin ? 'full' : ''} />
          ))}
        </div>
      </main>

      <aside className="margin">
        {clockStatus.kind !== 'ok' && (
          <div
            className={`notice ${clockStatus.kind}`}
            onClick={clockStatus.kind === 'unverified' ? v.trustClock : undefined}
          >
            {clockStatus.kind === 'behind' ? (
              <>
                The clock is <b>{formatDrift(clockStatus.behindMs)} behind</b>. Dates in your history will be off;
                connect your phone to sync.
              </>
            ) : (
              <>
                The clock may be wrong after the device lost power. <b>Tap if {hhmm(now)} is right.</b>
              </>
            )}
          </div>
        )}
        <dl>
          <dt>Session</dt>
          <dd>
            <span className="squares">
              {v.set.map((x, i) => (
                <i key={i} className={x} />
              ))}
            </span>
            {Math.min(v.cycle + 1, v.set.length)} of {v.set.length}
          </dd>
          <dt>{v.mode === 'running' ? 'Ends at' : 'Would end'}</dt>
          <dd className="tnum">{v.mode === 'paused' ? '—' : hhmm(endsAt)}</dd>
          <dt onClick={v.toggleHistory}>Today</dt>
          <dd onClick={v.toggleHistory}>
            {formatDuration(today.minutes)} · {today.sessions} {today.sessions === 1 ? 'session' : 'sessions'}
          </dd>
          <dt>Streak</dt>
          <dd>
            {v.streak} {v.streak === 1 ? 'day' : 'days'}
          </dd>
        </dl>
        <p className="colophon">
          {idle ? 'Turn to set' : 'Turn to adjust'} · Press to {{ pause: 'pause', resume: 'resume', start: 'begin' }[v.actions.press]} · Hold to{' '}
          {{ stop: 'stop', skip: 'skip', reset: 'reset' }[v.actions.hold]} · 4 history · M design
        </p>
      </aside>

      {/* A full e-ink refresh: black, white, then the new page. */}
      <div key={v.flash} className={v.flash ? 'refresh' : ''} />
    </div>
  );

}

/** E-ink ghosting: the previous value lingers faintly behind the new one. */
function Ghost({ value }: { value: number }) {
  const prev = useRef(value);
  const [ghost, setGhost] = useState<number | null>(null);
  useEffect(() => {
    if (prev.current !== value) {
      setGhost(prev.current);
      prev.current = value;
    }
  }, [value]);
  return ghost === null ? null : <span className="ghost">{ghost}</span>;
}
