import type { HistoryView } from '../types';
import { bar, boxLines, Crt, fit, KeyBar, StatusBar, T } from './term';
import { dayTotals, formatDuration, localDay, streak } from '../../timer';

const DAYS = 7;
const BAR_W = 30;
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dayStart(now: number, back: number): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - back);
  return d;
}

const hhmm = (t: number) => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const short = (d: Date) => `${MONTH[d.getMonth()]} ${d.getDate()}`;

/**
 * `pomodoro log`: seven days as an ASCII bar chart, the selected day's
 * sessions as journal lines. `selected` counts days back from today; the
 * window scrolls so the selected day is always on screen.
 */
export default function History({ history, now, selected, knob }: HistoryView) {
  const windowEnd = Math.floor(selected / DAYS) * DAYS;
  const days = Array.from({ length: DAYS }, (_, i) => {
    const back = windowEnd + DAYS - 1 - i;
    const date = dayStart(now, back);
    const key = localDay(date.getTime());
    return { back, date, key, ...dayTotals(history, key) };
  });
  const sel = days.find(d => d.back === selected)!;
  const max = Math.max(60, ...days.map(d => d.minutes));
  const weekMin = days.reduce((a, d) => a + d.minutes, 0);
  const weekSessions = days.reduce((a, d) => a + d.sessions, 0);
  const best = days.reduce((a, d) => (d.minutes > a.minutes ? d : a), days[0]);
  const entries = history.filter(e => localDay(e.start) === sel.key);
  const shown = entries.slice(-8);

  const summary: [string, string][] = [
    ['focused', formatDuration(weekMin)],
    ['sessions', String(weekSessions)],
    ['streak', `${streak(history, now)}d`],
    ['avg/day', formatDuration(Math.round(weekMin / DAYS))],
    ['best', best.minutes ? `${WEEKDAY[best.date.getDay()]} ${formatDuration(best.minutes)}` : '-'],
  ];
  const selLabel = `${WEEKDAY[sel.date.getDay()]} ${short(sel.date)}`;

  return (
    <div className="app phase-focus" {...knob}>
    <>
      <StatusBar now={now} middle={windowEnd ? `LOG :: WEEK -${windowEnd / DAYS}` : 'LOG :: THIS WEEK'} />

      <T x={2} y={2}>
        <span className="dim">carthing:~$ </span>pomodoro log --since "{short(days[0].date)}" --until "
        {short(days[DAYS - 1].date)}"
      </T>

      {days.map((d, i) => {
        const isSel = d.back === selected;
        const label = d.back === 0 ? 'Today ' : `${WEEKDAY[d.date.getDay()]} ${String(d.date.getDate()).padStart(2)}`;
        const b = bar(d.minutes / max, BAR_W);
        return (
          <T key={d.key} x={2} y={4 + i} className={isSel ? 'sel-row' : ''}>
            <span className={isSel ? '' : 'dim'}>
              {isSel ? '>' : ' '} {label} │
            </span>
            <span className={isSel ? '' : 'faded'}>{b}</span>
            <span className="dim">{' '.repeat(BAR_W - b.length)}│</span> {d.minutes ? formatDuration(d.minutes).padStart(6) : '     -'}
          </T>
        );
      })}

      <T x={54} y={4} className="dim">
        {boxLines('week', [], 24)[0]}
      </T>
      {summary.map(([k, v], i) => (
        <T key={k} x={54} y={5 + i}>
          <span className="dim">│ {k.padEnd(9)}</span>
          {fit(v, 12)}
          <span className="dim">│</span>
        </T>
      ))}
      <T x={54} y={10} className="dim">
        {boxLines('week', [], 24)[1]}
      </T>

      <T x={2} y={12} className="dim">
        {fit(`── ${selLabel} · ${sel.sessions} done · ${formatDuration(sel.minutes)} `, 76).replace(/ +$/, s =>
          '─'.repeat(s.length),
        )}
      </T>
      {entries.length === 0 ? (
        <T x={2} y={13} className="dim">
          -- No entries --
        </T>
      ) : (
        <>
          {entries.length > shown.length && (
            <T x={2} y={13} className="dim">
              -- {entries.length - shown.length} earlier entries hidden --
            </T>
          )}
          {shown.map((e, i) => (
            <T key={e.start} x={2} y={13 + i + (entries.length > shown.length ? 1 : 0)}>
              <span className="dim">{hhmm(e.start)}→{hhmm(e.end)} pomodoro: </span>
              <span className={e.done ? 'ok' : 'stop'}>{e.done ? '[  OK  ]' : '[ STOP ]'}</span> focus{' '}
              {formatDuration(Math.round(e.focusedMs / 60_000))}
            </T>
          ))}
        </>
      )}

      <KeyBar
        keys={[['4', 'Back']]}
        actions={[
          ['<->', 'day'],
          ['RET', 'close'],
        ]}
      />
    </>
      <Crt />
    </div>
  );
}
