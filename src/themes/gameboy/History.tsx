import { dayTotals, formatDuration, localDay, streak } from '../../timer';
import type { HistoryView } from '../types';
import { textWidth, type Gfx } from './engine';
import Screen from './Screen';
import { tomato } from './sprites';

const DAYS = 7;
const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAME = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const BASE_Y = 84;
const MAX_BAR = 26;

const gbDuration = (min: number) => formatDuration(min).replace(' ', '').toUpperCase();

function dayStart(now: number, back: number): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - back);
  return d;
}

/** A trainer card: week stats beside the hero, a bar per day, the selected day in the text box. */
export default function History({ history, now, selected, knob }: HistoryView) {
  const windowEnd = Math.floor(selected / DAYS) * DAYS;
  const days = Array.from({ length: DAYS }, (_, i) => {
    const back = windowEnd + DAYS - 1 - i;
    const date = dayStart(now, back);
    const key = localDay(date.getTime());
    return { back, date, ...dayTotals(history, key) };
  });
  const sel = days.find(d => d.back === selected)!;
  const max = Math.max(60, ...days.map(d => d.minutes));
  const weekMin = days.reduce((a, d) => a + d.minutes, 0);
  const wins = days.reduce((a, d) => a + d.sessions, 0);
  const days_ = streak(history, now);

  const draw = (g: Gfx) => {
    g.clear(0);
    g.box(0, 0, 200, 20);
    g.text('TRAINER CARD', 9, 6);
    const wk = windowEnd === 0 ? 'THIS WK' : `WK -${windowEnd / DAYS}`;
    g.text(wk, 191 - textWidth(wk), 6, 2);

    g.sprite(tomato(false), 10, 24, 2);
    const rows: [string, string][] = [
      ['TIME', gbDuration(weekMin)],
      ['WINS', String(wins)],
      ['STREAK', `${days_} ${days_ === 1 ? 'DAY' : 'DAYS'}`],
    ];
    rows.forEach(([k, val], i) => {
      g.text(k, 50, 25 + i * 10, 2);
      g.text(val, 192 - textWidth(val), 25 + i * 10);
    });

    g.rect(6, BASE_Y, 188, 1, 3);
    days.forEach((d, i) => {
      const cx = 9 + i * 26 + 13;
      const h = Math.round((d.minutes / max) * MAX_BAR);
      const isSel = d.back === selected;
      if (h > 0) g.rect(cx - 6, BASE_Y - h, 12, h, isSel ? 3 : 2);
      if (isSel) {
        const top = BASE_Y - h - 7;
        for (let r = 0; r < 4; r++) g.rect(cx - 3 + r, top + r, 7 - 2 * r, 1, 3);
        g.rect(cx - 6, 86, 12, 10, 3);
      }
      g.text(DAY_LETTER[d.date.getDay()], cx - 4, 87, isSel ? 0 : 3);
    });

    g.box(0, 98, 200, 22);
    const label = sel.back === 0 ? 'TODAY' : `${DAY_NAME[sel.date.getDay()]} ${sel.date.getDate()}`;
    g.text(`${label} ${sel.sessions}W ${gbDuration(sel.minutes)}`, 9, 105);
  };

  return (
    <div className="gb-root" {...knob}>
      <Screen draw={draw} animating={false} invert={() => false} />
    </div>
  );
}
