import { formatDuration, hhmm } from '../kit';
import type { HistoryView } from '../types';
import { bar, boxLines, Crt, fit, KeyBar, StatusBar, T } from './term';

const DAYS = 7;
const BAR_W = 30;
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


const short = (d: Date) => `${MONTH[d.getMonth()]} ${d.getDate()}`;

/**
 * `pomodoro log`: seven days as an ASCII bar chart, the selected day's
 * sessions as journal lines. `selected` counts days back from today; the
 * window scrolls so the selected day is always on screen.
 */
export default function History({ now, days, selected: sel, sessions: entries, week, streak, weeksAgo, knob }: HistoryView) {
  const max = Math.max(60, week.maxMinutes);
  const best = week.best;
  const shown = entries.slice(-8);

  const summary: [string, string][] = [
    ['focused', formatDuration(week.minutes)],
    ['sessions', String(week.sessions)],
    ['streak', `${streak}d`],
    ['avg/day', formatDuration(Math.round(week.minutes / DAYS))],
    ['best', best ? `${WEEKDAY[best.date.getDay()]} ${formatDuration(best.minutes)}` : '-'],
  ];
  const selLabel = `${WEEKDAY[sel.date.getDay()]} ${short(sel.date)}`;

  return (
    <div className="app phase-focus" {...knob}>
    <>
      <StatusBar now={now} middle={weeksAgo ? `LOG :: WEEK -${weeksAgo}` : 'LOG :: THIS WEEK'} />

      <T x={2} y={2}>
        <span className="dim">carthing:~$ </span>pomodoro log --since "{short(days[0].date)}" --until "
        {short(days[DAYS - 1].date)}"
      </T>

      {days.map((d, i) => {
        const isSel = d.selected;
        const label = d.back === 0 ? 'Today ' : `${WEEKDAY[d.date.getDay()]} ${String(d.date.getDate()).padStart(2)}`;
        const b = bar(d.minutes / max, BAR_W);
        return (
          <T key={d.back} x={2} y={4 + i} className={isSel ? 'sel-row' : ''}>
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
              {formatDuration(e.minutes)}
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
