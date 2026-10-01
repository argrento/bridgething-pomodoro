import { formatDuration, hhmm } from '../kit';
import type { HistoryView } from '../types';

const DAYS = 7;
const CHART_W = 440;
const CHART_H = 250;
const PAD_B = 40;
const PAD_T = 30;
const BAR_W = 22;
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];



/**
 * Seven days of focus, in the manner of an e-reader's reading insights.
 * Unselected days are dithered, the selected one solid ink. `selected`
 * counts days back from today; the window follows it.
 */
export default function History({ now, days, selected: sel, sessions: entries, week, streak, weeksAgo, knob }: HistoryView) {
  const max = Math.max(60, week.maxMinutes);
  const plotH = CHART_H - PAD_T - PAD_B;
  const slot = CHART_W / DAYS;
  const y = (min: number) => PAD_T + plotH * (1 - min / max);
  const first = days[0].date;
  const last = days[DAYS - 1].date;

  return (
    <div className="page" {...knob}>
    <div className="insights">
      <header className="masthead">
        <span className="sc">Insights</span>
        <span className="tnum">{hhmm(now)}</span>
      </header>

      <div className="ins-title">
        <h1>{weeksAgo === 0 ? 'This week' : weeksAgo === 1 ? 'Last week' : `${weeksAgo} weeks ago`}</h1>
        <div className="sub">
          {MONTH[first.getMonth()]} {first.getDate()} – {MONTH[last.getMonth()]} {last.getDate()}
        </div>
      </div>

      <div className="ins-stats">
        <div>
          <b>{formatDuration(week.minutes)}</b>
          <span>focused</span>
        </div>
        <div>
          <b>{week.sessions}</b>
          <span>sessions</span>
        </div>
        <div>
          <b>{streak}</b>
          <span>day streak</span>
        </div>
      </div>

      <svg className="ins-chart" width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
        <defs>
          {/* 50% ordered dither, the way an e-ink panel renders grey */}
          <pattern id="dither" width="3" height="3" patternUnits="userSpaceOnUse">
            <rect width="1.5" height="1.5" className="ink-fill" />
            <rect x="1.5" y="1.5" width="1.5" height="1.5" className="ink-fill" />
          </pattern>
        </defs>
        <line x1={0} x2={CHART_W} y1={y(0)} y2={y(0)} className="baseline" />
        {days.map((d, i) => {
          const cx = slot * (i + 0.5);
          const isSel = d.selected;
          return (
            <g key={d.back}>
              {d.minutes > 0 && (
                <rect
                  x={cx - BAR_W / 2}
                  y={y(d.minutes)}
                  width={BAR_W}
                  height={y(0) - y(d.minutes)}
                  className={isSel ? 'bar sel' : 'bar'}
                  fill={isSel ? undefined : 'url(#dither)'}
                />
              )}
              {isSel && (
                <text x={cx} y={y(d.minutes) - 9} className="bar-val" textAnchor="middle">
                  {d.minutes ? formatDuration(d.minutes) : '—'}
                </text>
              )}
              <text x={cx} y={y(0) + 18} className={isSel ? 'day sel' : 'day'} textAnchor="middle">
                {d.back === 0 ? 'Today' : WEEKDAY[d.date.getDay()]}
              </text>
              <text x={cx} y={y(0) + 33} className={isSel ? 'date sel' : 'date'} textAnchor="middle">
                {d.date.getDate()}
              </text>
            </g>
          );
        })}
      </svg>

      <aside className="ins-day">
        <div className="kicker">
          {sel.back === 0
            ? 'Today'
            : `${WEEKDAY_LONG[sel.date.getDay()]}, ${MONTH[sel.date.getMonth()]} ${sel.date.getDate()}`}
        </div>
        <div className="day-total">
          {formatDuration(sel.minutes)} · {sel.sessions} {sel.sessions === 1 ? 'session' : 'sessions'}
        </div>
        {entries.length === 0 ? (
          <p className="empty">Nothing recorded.</p>
        ) : (
          <ol>
            {entries.slice(0, 6).map(e => (
              <li key={e.start} className={e.done ? '' : 'stopped'}>
                <span className="tnum">
                  {hhmm(e.start)}–{hhmm(e.end)}
                </span>
                <span>{formatDuration(e.minutes)}</span>
                <em>{e.done ? 'complete' : 'stopped'}</em>
              </li>
            ))}
            {entries.length > 6 && <li className="more">and {entries.length - 6} more</li>}
          </ol>
        )}
      </aside>

      <p className="colophon ins-colophon">Turn to browse days · Press to close</p>
    </div>
    </div>
  );
}
