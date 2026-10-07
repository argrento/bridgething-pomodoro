import { formatDuration, hhmm } from '../kit';
import type { HistoryView } from '../types';
import { Key, Lamp, Pair, Register } from './parts';

const DAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const five = (n: number) => String(Math.min(n, 99999)).padStart(5, '0');

/**
 * The flight log: the annunciator becomes seven day lamps, lit for days with
 * focus and amber for the one selected; the registers read out that day.
 */
export default function History({ days, selected, sessions, week, streak, weeksAgo, knob }: HistoryView) {
  return (
    <div className="dsky log" {...knob}>
      <div className="annunciator days">
        {days.map(d => (
          <Lamp key={d.back} on={d.minutes > 0 || d.selected} amber={d.selected}>
            <span>{d.back === 0 ? 'TODAY' : `${DAY[d.date.getDay()]} ${d.date.getDate()}`}</span>
            <span>{d.minutes ? formatDuration(d.minutes).toUpperCase() : '—'}</span>
          </Lamp>
        ))}
      </div>

      <div className="el">
        <div className="el-row">
          <div className="comp-acty">
            COMP
            <br />
            ACTY
          </div>
          <div className="field">
            <div className="tag">PROG</div>
            <Pair text={String(Math.min(weeksAgo, 99)).padStart(2, '0')} />
          </div>
        </div>
        <div className="el-row">
          <div className="field">
            <div className="tag">VERB</div>
            <Pair text="06" />
          </div>
          <div className="field">
            <div className="tag">NOUN</div>
            <Pair text="34" />
          </div>
        </div>
        <Register sign="+" text={five(selected.minutes)} />
        <Register sign="+" text={five(selected.sessions)} />
        <Register sign="+" text={five(streak)} />
      </div>

      <div className="deck">
        <Key cap="+ −" hint="TURN · DAY" />
        <Key cap="PRO" hint="PRESS · BACK" />
        <div className="card">
          <b>
            {weeksAgo === 0 ? 'THIS WEEK' : `${weeksAgo} WK AGO`} · {formatDuration(week.minutes).toUpperCase()} ·{' '}
            {week.sessions} DONE
          </b>
          {sessions.length === 0 ? (
            <span>NO LANDINGS LOGGED</span>
          ) : (
            <span>
              {sessions
                .slice(0, 3)
                .map(s => `${hhmm(s.start)}–${hhmm(s.end)} ${s.minutes}′${s.done ? '' : ' ABORT'}`)
                .join('  ·  ')}
            </span>
          )}
          <span className="legend">R1 MIN · R2 LANDINGS · R3 STREAK</span>
        </div>
      </div>
    </div>
  );
}
