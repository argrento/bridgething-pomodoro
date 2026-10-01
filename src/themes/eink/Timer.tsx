import { useEffect, useRef, useState } from 'react';
import { formatDrift } from '../../clock';
import { formatDuration, hhmm, PHASE_LABEL, SESSIONS_PER_SET } from '../../timer';
import type { TimerView } from '../types';

export default function Timer(v: TimerView) {
  const { state, now, left, endsAt, today, clock: clockStatus } = v;
  // E-ink pacing: the numeral changes once a minute; seconds only in the last one.
  const idle = state.mode === 'idle';
  const setMin = state.settings[state.phase];
  const lastMinute = !idle && left < 60_000;
  const big = idle ? setMin : lastMinute ? Math.ceil(left / 1000) : Math.ceil(left / 60_000);
  const remainingMin = idle ? setMin : Math.ceil(left / 60_000);
  const dotCount = Math.min(90, Math.max(setMin, remainingMin));

  return (
    <div className={`page phase-${state.phase} mode-${state.mode}`}>
      <header className="masthead">
        <span className="sc">Pomodoro</span>
        <span className="tnum">{hhmm(now)}</span>
      </header>

      <main className="leaf" {...v.knob}>
        <div className="kicker">
          {PHASE_LABEL[state.phase]}
          {state.mode === 'paused' && <em> — paused</em>}
          {idle && state.phase !== 'focus' && <em> — up next</em>}
        </div>
        <div className="numeral">
          <Ghost value={big} />
          <span className="ink">{big}</span>
        </div>
        <div className="caption">
          {lastMinute
            ? 'seconds remaining'
            : idle
              ? `${setMin === 1 ? 'minute' : 'minutes'} of ${state.phase === 'focus' ? 'focus' : 'rest'}`
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
              {Array.from({ length: SESSIONS_PER_SET }, (_, i) => (
                <i
                  key={i}
                  className={
                    i < state.cycle ? 'done' : i === state.cycle && state.phase === 'focus' && !idle ? 'live' : ''
                  }
                />
              ))}
            </span>
            {Math.min(state.cycle + 1, SESSIONS_PER_SET)} of {SESSIONS_PER_SET}
          </dd>
          <dt>{state.mode === 'running' ? 'Ends at' : 'Would end'}</dt>
          <dd className="tnum">{state.mode === 'paused' ? '—' : hhmm(endsAt)}</dd>
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
          {idle ? 'Turn to set' : 'Turn to adjust'} · Press to {state.mode === 'running' ? 'pause' : state.mode === 'paused' ? 'resume' : 'begin'} · Hold to{' '}
          {!idle ? 'stop' : state.phase !== 'focus' ? 'skip' : 'reset'} · 4 history · M design
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
