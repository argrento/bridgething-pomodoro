import { formatDrift, hhmm as clock, PHASE_LABEL } from '../kit';
import type { TimerView } from '../types';
import Dial from './Dial';

export default function Timer(v: TimerView) {
  const { now, endsAt, today, clock: clockStatus } = v;
  const idle = v.mode === 'idle';
  const setMin = v.setMinutes;
  const section = { focus: 1, short: 2, long: 3 }[v.phase];
  const pattern = { focus: 'hatched', short: 'dotted', long: 'cross-hatched' }[v.phase];
  const rows = v.set.map((slot, i) => {
    const status = slot === 'done' ? '✓' : slot === 'live' ? (v.mode === 'paused' ? 'suspended' : 'in progress') : '—';
    return { n: i + 1, status, live: slot === 'live' };
  });

  return (
    <div className={`app phase-${v.phase} mode-${v.mode}`}>
      <div key={v.flash} className={v.flash ? 'flash' : ''} />

      <header className="runhead">
        <span className="sc">J. Appl. Chronometry</span>
        <span>
          <i>Vol.</i> 1, <i>No.</i> {Math.min(v.cycle + 1, v.set.length)} &nbsp;·&nbsp; {clock(now)}
        </span>
      </header>

      <figure className="fig" {...v.knob}>
        <Dial
          minutes={v.leftMs / 60_000}
          phase={v.phase}
          mode={v.mode}
          primary={idle ? String(setMin) : v.countdown}
          secondary={idle ? (setMin === 1 ? 'minute' : 'minutes') : v.mode === 'paused' ? '(suspended)' : 'remaining'}
          holding={v.holding}
          bump={v.bump}
        />
        <figcaption>
          <b>Figure 1.</b> Remaining time Δ<i>t</i> of the {PHASE_LABEL[v.phase].toLowerCase()} interval; the{' '}
          {pattern} sector is proportional to Δ<i>t</i>. One detent of the knob equals 1 min.
        </figcaption>
      </figure>

      <aside className="col">
        <section>
          <h1>
            <span className="secno">{section}</span>
            {PHASE_LABEL[v.phase]}
          </h1>
          {clockStatus.kind !== 'ok' ? (
            <p
              className={`abstract erratum ${clockStatus.kind}`}
              onClick={clockStatus.kind === 'unverified' ? v.trustClock : undefined}
            >
              <b>Erratum.</b>{' '}
              {clockStatus.kind === 'behind' ? (
                <>
                  System time lags by {formatDrift(clockStatus.behindMs)}; dates reported herein are unreliable.
                  Connect the phone to resynchronise.
                </>
              ) : (
                <>
                  System time unverified after power loss. <i>Tap to confirm</i> {clock(now)}.
                </>
              )}
            </p>
          ) : (
          <p className="abstract">
            {v.mode === 'running' && <>Interval in progress; concludes at {clock(endsAt)}.</>}
            {v.mode === 'paused' && <>Interval suspended with {v.countdown} remaining.</>}
            {idle &&
              (v.phase === 'focus' ? (
                <>Awaiting commencement. Set Δ<i>t</i> = {setMin} min.</>
              ) : (
                <>Focus concluded. Break of {setMin} min proposed.</>
              ))}
          </p>
          )}
        </section>

        <div className="float">
          <div className="caption">
            <b>Table 1.</b> Sessions of the present set.
          </div>
          <table>
            <thead>
              <tr>
                <th>Session</th>
                <th className="r">
                  Δ<i>t</i> [min]
                </th>
                <th className="r">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.n} className={r.live ? 'live' : ''}>
                  <td>Focus {r.n}</td>
                  <td className="r num">{v.focusMinutes}</td>
                  <td className="r">{r.live ? <i>{r.status}</i> : r.status}</td>
                </tr>
              ))}
            </tbody>
            <tfoot onClick={v.toggleHistory}>
              <tr>
                <td>Today</td>
                <td className="r num">{today.minutes}</td>
                <td className="r">
                  <i>n</i> = {today.sessions}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="float algo">
          <div className="caption algo-head">
            <b>Algorithm 1</b> Operating protocol
          </div>
          <ol>
            <li>
              <b>rotate</b> knob
              <span className="cmt">▷ {idle ? <>set Δ<i>t</i></> : <>adjust ±1 min</>}</span>
            </li>
            <li>
              <b>press</b> knob
              <span className="cmt">▷ {{ pause: 'pause', resume: 'resume', start: 'start' }[v.actions.press]}</span>
            </li>
            <li>
              <b>hold</b> knob
              <span className="cmt">
                ▷ {{ stop: 'stop', skip: 'skip break', reset: 'reset set' }[v.actions.hold]}
              </span>
            </li>
            <li>
              <b>press</b> 4, M<span className="cmt">▷ log, design</span>
            </li>
          </ol>
        </div>
      </aside>
    </div>
  );

}
