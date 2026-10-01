import { formatDuration, hhmm } from '../kit';
import type { HistoryView } from '../types';

const DAYS = 7;
const W = 450;
const H = 300;
const L = 46;
const B = 36;
const T = 14;
const BAR_W = 24;
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


function niceStep(max: number): number {
  for (const step of [15, 30, 60, 120, 180]) if (max / step <= 5) return step;
  return 240;
}

/**
 * Results section: Figure 2 plots focus per day as a TikZ-style bar chart
 * (selected day solid, others hatched); Table 2 lists that day's sessions.
 */
export default function History({ now, days, selected: sel, sessions: entries, week, streak, weeksAgo, knob }: HistoryView) {
  const step = niceStep(Math.max(60, week.maxMinutes));
  const top = Math.ceil(Math.max(60, week.maxMinutes) / step) * step;
  const plotH = H - T - B;
  const slot = (W - L) / DAYS;
  const y = (m: number) => T + plotH * (1 - m / top);
  const ticks = Array.from({ length: top / step + 1 }, (_, k) => k * step);
  const first = days[0].date;
  const last = days[DAYS - 1].date;
  const range = `${MONTH[first.getMonth()]} ${first.getDate()}–${MONTH[last.getMonth()]} ${last.getDate()}`;
  const selName = `${WEEKDAY[sel.date.getDay()]} ${MONTH[sel.date.getMonth()]} ${sel.date.getDate()}`;

  return (
    <div className="app phase-focus" {...knob}>
      <header className="runhead">
        <span className="sc">J. Appl. Chronometry</span>
        <span>
          <i>Results</i> &nbsp;·&nbsp; {hhmm(now)}
        </span>
      </header>

      <figure className="fig hist-fig">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="figure">
          <defs>
            <pattern id="jhatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="5" className="pat" />
            </pattern>
            <marker id="jarrow" viewBox="-8 -4 9 8" markerWidth="9" markerHeight="8" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M 0 0 L -8 -3.6 L -5.6 0 L -8 3.6 Z" className="ink-fill" />
            </marker>
          </defs>
          {ticks.map(t => (
            <g key={t}>
              {t > 0 && <line x1={L} x2={W - 4} y1={y(t)} y2={y(t)} className="help" />}
              <line x1={L - 4} x2={L} y1={y(t)} y2={y(t)} className="tick major" />
              <text x={L - 8} y={y(t)} className="tick-label" textAnchor="end" dominantBaseline="central">
                {t}
              </text>
            </g>
          ))}
          <line x1={L} y1={y(0)} x2={L} y2={T - 6} className="axis-line" markerEnd="url(#jarrow)" />
          <line x1={L} y1={y(0)} x2={W} y2={y(0)} className="axis-line" markerEnd="url(#jarrow)" />
          <text x={L + 6} y={T - 2} className="annot">
            <tspan className="it">t</tspan> [min]
          </text>
          {days.map((d, i) => {
            const cx = L + slot * (i + 0.5);
            const isSel = d.selected;
            return (
              <g key={d.back}>
                {d.minutes > 0 && (
                  <rect
                    x={cx - BAR_W / 2}
                    y={y(d.minutes)}
                    width={BAR_W}
                    height={y(0) - y(d.minutes)}
                    className={isSel ? 'hbar sel' : 'hbar'}
                    fill={isSel ? undefined : 'url(#jhatch)'}
                  />
                )}
                <text x={cx} y={y(0) + 15} className={isSel ? 'tick-label sel' : 'tick-label'} textAnchor="middle">
                  {d.back === 0 ? 'today' : WEEKDAY[d.date.getDay()]}
                </text>
                <text x={cx} y={y(0) + 29} className="tick-label small" textAnchor="middle">
                  {d.date.getDate()}
                </text>
              </g>
            );
          })}
        </svg>
        <figcaption>
          <b>Figure 2.</b> Daily focus time <i>t</i>, {range}. The selected day ({selName}) is drawn solid; the
          remainder hatched.
        </figcaption>
      </figure>

      <aside className="col">
        <section>
          <h1>
            <span className="secno">4</span>Results
          </h1>
          <p className="abstract">
            Over the period, {formatDuration(week.minutes)} of focus was recorded in {week.sessions}{' '}
            {week.sessions === 1 ? 'session' : 'sessions'}; the current streak is {streak}{' '}
            {streak === 1 ? 'day' : 'days'}.
          </p>
        </section>

        <div className="float">
          <div className="caption">
            <b>Table 2.</b> Sessions on {selName}.
          </div>
          <table>
            <thead>
              <tr>
                <th>Interval</th>
                <th className="r">
                  <i>t</i> [min]
                </th>
                <th className="r">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={3}>
                    <i className="roman">No data.</i>
                  </td>
                </tr>
              ) : (
                entries.slice(0, 5).map(e => (
                  <tr key={e.start}>
                    <td>
                      {hhmm(e.start)}–{hhmm(e.end)}
                    </td>
                    <td className="r num">{e.minutes}</td>
                    <td className="r">{e.done ? '✓' : <i className="roman">aborted</i>}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="r num">{sel.minutes}</td>
                <td className="r">
                  <i>n</i> = {sel.sessions}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="hint">Rotate to select a day; press to return.</p>
      </aside>
    </div>
  );
}
