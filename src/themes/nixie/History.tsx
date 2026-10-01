import { formatDuration, hhmm } from '../kit';
import type { HistoryView } from '../types';
import { Bargraph, Lamp, TubeRow } from './parts';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** H:MM for the small tubes. */
const hm = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

/** A week as seven vertical IN-9 bargraphs; the selected day's total in small tubes. */
export default function History({ days, selected, sessions, week, streak, weeksAgo, knob }: HistoryView) {
  const max = Math.max(60, week.maxMinutes);
  return (
    <div className="panel log" {...knob}>
      <div className="week">
        {days.map(d => (
          <div key={d.back} className={`day${d.selected ? ' sel' : ''}`}>
            <Bargraph frac={d.minutes / max} vertical />
            <Lamp state={d.selected ? 'on' : 'off'} />
            <span className="plate">{d.back === 0 ? 'Today' : DAY[d.date.getDay()]}</span>
          </div>
        ))}
      </div>

      <div className="log-side">
        <span className="plate">{selected.back === 0 ? 'Today' : `${DAY[selected.date.getDay()]} ${selected.date.getDate()}`}</span>
        <TubeRow text={hm(selected.minutes)} size="small" />
        <ul className="entries">
          {sessions.length === 0 && <li className="engraved dim">No sessions</li>}
          {sessions.slice(0, 4).map(s => (
            <li key={s.start} className={`engraved${s.done ? '' : ' dim'}`}>
              {hhmm(s.start)}–{hhmm(s.end)} <b>{s.minutes}′</b> {s.done ? '●' : '○'}
            </li>
          ))}
        </ul>
      </div>

      <div className="legend">
        <span className="plate">{weeksAgo === 0 ? 'This week' : `${weeksAgo} wk ago`}</span>
        <span className="plate">{formatDuration(week.minutes)}</span>
        <span className="plate">{week.sessions} done</span>
        <span className="plate">Streak {streak}</span>
        <span className="plate">Turn · day</span>
      </div>
    </div>
  );
}
