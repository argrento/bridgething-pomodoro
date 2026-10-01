import { formatDuration, hhmm } from '../kit';
import type { HistoryView } from '../types';

const DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const COL = 10;
/** Logs drawn per day before the pile is summarised. */
const PILE = 9;
const LOG_DONE = '(====)';
const LOG_STOPPED = '(==)';

const center = (s: string, w: number) => {
  const pad = Math.max(0, w - s.length);
  return ' '.repeat(Math.floor(pad / 2)) + s + ' '.repeat(Math.ceil(pad / 2));
};

/**
 * The woodpile: each day a stack of logs, one per session (short logs for
 * stopped ones). The selected day's sessions are listed beside it.
 */
export default function History({ days, selected, sessions, week, streak, weeksAgo, knob }: HistoryView) {
  // Build the piles bottom-up, then print them top-down.
  const piles = days.map(d => {
    const logs: string[] = Array(d.sessions).fill(LOG_DONE);
    return logs.length > PILE ? [...logs.slice(0, PILE - 1), `+${logs.length - PILE + 1}`] : logs;
  });
  // stopped sessions only show for the selected day, which has its sessions loaded
  piles[days.indexOf(selected)] = [
    ...sessions.filter(s => s.done).map(() => LOG_DONE),
    ...sessions.filter(s => !s.done).map(() => LOG_STOPPED),
  ].slice(0, PILE);

  const lines: string[] = [];
  for (let row = PILE - 1; row >= 0; row--) {
    lines.push(piles.map(p => center(p[row] ?? '', COL)).join(''));
  }
  lines.push('_'.repeat(COL * days.length));
  lines.push(days.map(d => center(d.back === 0 ? 'today' : `${DAY[d.date.getDay()]} ${d.date.getDate()}`, COL)).join(''));
  lines.push(days.map(d => center(d.selected ? '^^^^' : '', COL)).join(''));

  const title = selected.back === 0 ? 'tonight' : `${DAY[selected.date.getDay()]} ${selected.date.getDate()}`;
  const log = [
    `.-[ logbook: ${title} ]`,
    '|',
    ...(sessions.length
      ? sessions.slice(0, 7).map(s => `| ${hhmm(s.start)}-${hhmm(s.end)} ${String(s.minutes).padStart(3)}m ${s.done ? 'burned' : 'doused'}`)
      : ['| no fire that night']),
    '|',
    `'- ${formatDuration(selected.minutes)} by the fire`,
  ].join('\n');

  return (
    <div className="night woodpile" {...knob}>
      <pre className="pile">{lines.join('\n')}</pre>
      <pre className="logbook">{log}</pre>
      <pre className="message">
        {`${weeksAgo === 0 ? 'this week' : `${weeksAgo} week${weeksAgo > 1 ? 's' : ''} ago`}: ${formatDuration(week.minutes)} by the fire, ${week.sessions} logs burned, ${streak}-night streak`}
      </pre>
      <pre className="hints">turn: pick a day | press: back to the fire</pre>
    </div>
  );
}
