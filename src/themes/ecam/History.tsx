import { formatDuration, hhmm } from '../kit';
import type { HistoryView } from '../types';

const DAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const block = (min: number) => formatDuration(min).replace(' ', '').toUpperCase();

/** A tech-log page in ECAM colours: one row per day, the chosen day's legs below. */
export default function History({ days, sessions, week, streak, weeksAgo, knob }: HistoryView) {
  const max = Math.max(60, week.maxMinutes);
  return (
    <div className="ecam log" {...knob}>
      <div className="log-title">
        <span className="tone-white">TECH LOG</span>
        <span className="tone-cyan">{weeksAgo === 0 ? 'THIS WEEK' : `-${weeksAgo} WK`}</span>
      </div>
      <div className="log-head tone-cyan">
        <span>DATE</span>
        <span>LEGS</span>
        <span>BLOCK</span>
        <span />
      </div>
      {days.map(d => (
        <div key={d.back} className={`log-row${d.selected ? ' sel' : ''}`}>
          <span className="tone-white">
            {d.selected ? '>' : ' '}
            {d.back === 0 ? 'TODAY' : `${DAY[d.date.getDay()]} ${String(d.date.getDate()).padStart(2, '0')} ${MONTH[d.date.getMonth()]}`}
          </span>
          <span className="tone-green">{d.sessions}</span>
          <span className="tone-green">{d.minutes ? block(d.minutes) : '--'}</span>
          <span className="bar">
            <i style={{ width: `${(d.minutes / max) * 100}%` }} />
          </span>
        </div>
      ))}
      <div className="log-legs">
        {sessions.length === 0 && <div className="tone-white dim">NO LEGS FLOWN</div>}
        {sessions.slice(0, 3).map((s, i) => (
          <div key={s.start}>
            <span className="tone-cyan">LEG {sessions.length - i}</span> <span className="tone-green">{hhmm(s.start)}-{hhmm(s.end)}</span>{' '}
            <span className="tone-green">{s.minutes} MIN</span>{' '}
            <span className={s.done ? 'tone-green' : 'tone-amber'}>{s.done ? 'LANDED' : 'RETURNED'}</span>
          </div>
        ))}
      </div>
      <div className="log-foot">
        <span className="tone-cyan">WEEK BLOCK</span> <span className="tone-green">{block(week.minutes)}</span>
        <span className="tone-cyan">LEGS</span> <span className="tone-green">{week.sessions}</span>
        <span className="tone-cyan">DUTY DAYS</span> <span className="tone-green">{streak}</span>
      </div>
    </div>
  );
}
