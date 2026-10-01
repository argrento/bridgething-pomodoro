import type { HistoryView } from '../types';
import { dayTotals, formatDuration, localDay, streak } from '../../timer';

const DAYS = 7;
const CHART_W = 470;
const CHART_H = 300;
const PAD_L = 44;
const PAD_B = 34;
const PAD_T = 26;
const BAR_W = 26;
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dayStart(now: number, back: number): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - back);
  return d;
}

/** Gridline step that gives two to four lines for the window's busiest day. */
function niceStep(max: number): number {
  for (const step of [15, 30, 60, 120, 180, 240]) if (max / step <= 4) return step;
  return 360;
}

const hhmm = (t: number) => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * Seven-day view of the on-device session log. `selected` counts days back
 * from today; the window scrolls so the selected day is always on screen.
 */
export default function History({ history, now, selected, knob }: HistoryView) {
  // Window: the 7 days ending at the newest day that keeps `selected` visible.
  const windowEnd = Math.floor(selected / DAYS) * DAYS;
  const days = Array.from({ length: DAYS }, (_, i) => {
    const back = windowEnd + DAYS - 1 - i;
    const date = dayStart(now, back);
    const key = localDay(date.getTime());
    return { back, date, key, ...dayTotals(history, key) };
  });
  const sel = days.find(d => d.back === selected)!;
  const max = Math.max(60, ...days.map(d => d.minutes));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const plotH = CHART_H - PAD_T - PAD_B;
  const slot = (CHART_W - PAD_L) / DAYS;
  const y = (min: number) => PAD_T + plotH * (1 - min / top);
  const grid = Array.from({ length: top / step + 1 }, (_, k) => k * step);

  const weekMin = days.reduce((a, d) => a + d.minutes, 0);
  const weekSessions = days.reduce((a, d) => a + d.sessions, 0);
  const first = days[0].date;
  const last = days[DAYS - 1].date;
  const entries = history.filter(e => localDay(e.start) === sel.key).reverse();

  return (
    <div className="app phase-focus" {...knob}>
      <div className="glow" />
    <div className="history">
      <header className="h-head">
        <div>
          <div className="eyebrow">History</div>
          <h1>
            {MONTH[first.getMonth()]} {first.getDate()} – {MONTH[last.getMonth()]} {last.getDate()}
          </h1>
        </div>
        <div className="h-stats">
          <div>
            <b>{formatDuration(weekMin)}</b>
            <span>focused</span>
          </div>
          <div>
            <b>{weekSessions}</b>
            <span>sessions</span>
          </div>
          <div>
            <b>{streak(history, now)}</b>
            <span>day streak</span>
          </div>
        </div>
      </header>

      <svg className="h-chart" width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
        {grid.map(g => (
          <g key={g}>
            <line x1={PAD_L} x2={CHART_W} y1={y(g)} y2={y(g)} className={g === 0 ? 'h-base' : 'h-grid'} />
            {g > 0 && (
              <text x={PAD_L - 10} y={y(g)} className="h-axis" textAnchor="end" dominantBaseline="central">
                {formatDuration(g)}
              </text>
            )}
          </g>
        ))}
        {days.map((d, i) => {
          const cx = PAD_L + slot * (i + 0.5);
          const h = y(0) - y(d.minutes);
          const isSel = d.back === selected;
          return (
            <g key={d.key} className={isSel ? 'h-day sel' : 'h-day'}>
              {isSel && <rect x={cx - slot / 2 + 3} y={PAD_T - 18} width={slot - 6} height={plotH + 18 + PAD_B - 2} rx={10} className="h-sel" />}
              {d.minutes > 0 && (
                // Rounded data end, square at the baseline.
                <path
                  className="h-bar"
                  d={`M ${cx - BAR_W / 2} ${y(0)} V ${y(d.minutes) + Math.min(4, h)} Q ${cx - BAR_W / 2} ${y(d.minutes)} ${cx - BAR_W / 2 + 4} ${y(d.minutes)} H ${cx + BAR_W / 2 - 4} Q ${cx + BAR_W / 2} ${y(d.minutes)} ${cx + BAR_W / 2} ${y(d.minutes) + Math.min(4, h)} V ${y(0)} Z`}
                />
              )}
              {isSel && d.minutes > 0 && (
                <text x={cx} y={y(d.minutes) - 8} className="h-value" textAnchor="middle">
                  {formatDuration(d.minutes)}
                </text>
              )}
              <text x={cx} y={y(0) + 15} className="h-wd" textAnchor="middle">
                {d.back === 0 ? 'Today' : WEEKDAY[d.date.getDay()]}
              </text>
              <text x={cx} y={y(0) + 28} className="h-dd" textAnchor="middle">
                {d.date.getDate()}
              </text>
            </g>
          );
        })}
      </svg>

      <aside className="h-list">
        <div className="eyebrow">
          {sel.back === 0 ? 'Today' : `${WEEKDAY[sel.date.getDay()]}, ${MONTH[sel.date.getMonth()]} ${sel.date.getDate()}`}
        </div>
        <div className="h-day-total">
          {sel.sessions} {sel.sessions === 1 ? 'session' : 'sessions'} · {formatDuration(sel.minutes)}
        </div>
        {entries.length === 0 ? (
          <p className="h-empty">No focus sessions.</p>
        ) : (
          <ul>
            {entries.slice(0, 6).map(e => (
              <li key={e.start} className={e.done ? '' : 'stopped'}>
                <span className="h-time">
                  {hhmm(e.start)}–{hhmm(e.end)}
                </span>
                <span className="h-dur">{formatDuration(Math.round(e.focusedMs / 60_000))}</span>
                <span className="h-mark">{e.done ? '✓' : 'stopped'}</span>
              </li>
            ))}
            {entries.length > 6 && <li className="h-more">+{entries.length - 6} more</li>}
          </ul>
        )}
      </aside>

      <footer className="h-hint">Turn to browse days · Press to close</footer>
    </div>
    </div>
  );
}
