import { hhmm } from '../kit';
import type { HistoryView } from '../types';
import { FlapText } from './Flap';

const DAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const ROW_LEN = 34;

/** "25M", "2H30": four cells at most. */
const short = (min: number) => (min < 60 ? `${min}M` : `${Math.floor(min / 60)}H${String(min % 60).padStart(2, '0')}`);


/** An arrivals board: a week of daily totals on top, the selected day's sessions below. */
export default function History({ now, days, selected: sel, sessions: entries, week, streak, weeksAgo, knob }: HistoryView) {

  return (
    <div className="board" {...knob}>
      <header className="sf-head">
        <span className="sf-title">
          <i className="plane land" />
          Arrivals
        </span>
        <FlapText text={`${DAY[sel.date.getDay()]} ${sel.date.getDate()} ${MONTH[sel.date.getMonth()]}`} len={10} />
      </header>

      <div className="sf-week">
        {days.map(d => (
          <div key={d.back} className={`sf-day${d.selected ? ' sel' : ''}`}>
            <FlapText text={d.back === 0 ? 'TDY' : DAY[d.date.getDay()]} len={3} />
            <FlapText text={d.minutes ? short(d.minutes) : '-'} len={4} />
          </div>
        ))}
      </div>

      <div className="sf-table">
        <div className="sf-labels">
          <span style={{ width: `${6 * 21}px` }}>Time</span>
          <span style={{ width: `${12 * 21}px` }}>From</span>
          <span style={{ width: `${5 * 21}px` }}>Dur</span>
          <span>Status</span>
        </div>
        {Array.from({ length: 4 }, (_, i) => {
          const e = entries[i];
          const text = e
            ? `${hhmm(e.start)} ${'FOCUS'.padEnd(11)} ${short(e.minutes).padEnd(4)} ${e.done ? 'ARRIVED' : 'CANCELLED'}`
            : i === 0
              ? `${'-----'} NO FLIGHTS`
              : '';
          return (
            <div key={i} className={`sf-row${e && !e.done ? ' cancelled' : ''}`}>
              <FlapText text={text} len={ROW_LEN} />
            </div>
          );
        })}
      </div>

      <div className="sf-footer">
        <FlapText text={`WEEK ${short(week.minutes)} ${week.sessions} FLIGHTS STREAK ${streak}D`} len={ROW_LEN} />
      </div>
      <p className="sf-hints">Turn: day · Press: back to departures</p>
    </div>
  );
}
