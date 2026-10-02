import { formatDuration, hhmm } from '../kit';
import type { HistoryView } from '../types';
import { H, osd, textWidth, VCR_BLUE, vhs, W, WHITE, type Frame } from './engine';
import Screen from './Screen';

const DAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const compact = (min: number) => formatDuration(min).replace(' ', '').toUpperCase();

/** The VCR's blue tape index: one tape per day, the chosen day's recordings below. */
export default function History({ days, sessions, week, streak, weeksAgo, knob }: HistoryView) {
  const max = Math.max(60, week.maxMinutes);
  const draw = (f: Frame) => {
    f.fill(VCR_BLUE);
    const title = 'TAPE INDEX';
    osd(f, title, Math.round((W - textWidth(title, 2)) / 2), 5, 2, WHITE, false);
    const sub = weeksAgo === 0 ? 'THIS WEEK' : `${weeksAgo} WEEK${weeksAgo > 1 ? 'S' : ''} AGO`;
    osd(f, sub, Math.round((W - textWidth(sub)) / 2), 22, 1, WHITE, false);
    days.forEach((d, i) => {
      const y = 34 + i * 10;
      const ink = d.selected ? VCR_BLUE : WHITE;
      if (d.selected) f.rect(6, y - 2, W - 12, 10, WHITE);
      osd(f, d.back === 0 ? 'TODAY' : `${DAY[d.date.getDay()]} ${String(d.date.getDate()).padStart(2, '0')}`, 10, y, 1, ink, false);
      const w = Math.round((d.minutes / max) * 100);
      f.rect(62, y + 1, w, 5, ink);
      const val = d.minutes ? compact(d.minutes) : '--';
      osd(f, val, W - 10 - textWidth(val), y, 1, ink, false);
    });
    f.rect(6, 106, W - 12, 1, WHITE);
    const lines = sessions.length
      ? sessions.slice(0, 1).map(s => `${hhmm(s.start)}-${hhmm(s.end)} ${String(s.minutes).padStart(3)}M ${s.done ? 'RECORDED' : 'CUT'}`)
      : ['NO RECORDINGS'];
    lines.forEach((l, i) => osd(f, l, 10, 110 + i * 9, 1, WHITE, false));
    const foot = `WEEK ${compact(week.minutes)}  ${week.sessions} TAPES  STREAK ${streak}`;
    osd(f, foot, Math.round((W - textWidth(foot)) / 2), H - 16, 1, WHITE, false);
    vhs(f, 0);
  };
  return (
    <div className="backrooms-root" {...knob}>
      <Screen draw={draw} animating={false} />
    </div>
  );
}
