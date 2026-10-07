import { formatDuration, hhmm } from '../kit';
import type { HistoryView } from '../types';
import Sky from './Sky';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The week over a still sky: a total per day, the selected day's sessions below. */
export default function History({ days, selected, sessions, week, weeksAgo, knob }: HistoryView) {
  return (
    <div className="stars" {...knob}>
      <Sky speed={0}>
        <div className="log">
          <div className="log-head">
            {weeksAgo === 0 ? 'This week' : weeksAgo === 1 ? 'Last week' : `${weeksAgo} weeks ago`} ·{' '}
            {formatDuration(week.minutes)} · {week.sessions} sessions
          </div>
          <div className="week">
            {days.map(d => (
              <div key={d.back} className={`day${d.selected ? ' sel' : ''}${d.minutes ? '' : ' empty'}`}>
                <span>{d.back === 0 ? 'Today' : DAY[d.date.getDay()]}</span>
                <b>{d.minutes ? formatDuration(d.minutes) : '–'}</b>
              </div>
            ))}
          </div>
          <ul className="sessions">
            {sessions.length === 0 && <li className="none">No sessions</li>}
            {sessions.slice(0, 5).map(s => (
              <li key={s.start} className={s.done ? '' : 'stopped'}>
                {hhmm(s.start)}–{hhmm(s.end)} · {formatDuration(s.minutes)}
              </li>
            ))}
          </ul>
          <div className="log-hint">{selected.back === 0 ? 'Today' : `${selected.date.getDate()}.${selected.date.getMonth() + 1}`} · turn to browse · press to close</div>
        </div>
      </Sky>
    </div>
  );
}
