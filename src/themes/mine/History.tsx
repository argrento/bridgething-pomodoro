import { formatDuration, hhmm } from '../kit';
import type { HistoryView } from '../types';
import { blockAt, BS, GOLD, GREY, mix, rgb, shade, text, TEX, W, WHITE, width3, type Block, type Frame } from './engine';
import Screen from './Screen';

const DAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const compact = (min: number) => formatDuration(min).replace(' ', '').toUpperCase();
/** The deepest shaft (the week's busiest day) is this many blocks. */
const MAX_DEPTH = 8;

/** The week as seven shafts in one cross-section: deeper for more focus. */
export default function History({ days, sessions, week, weeksAgo, knob }: HistoryView) {
  const draw = (f: Frame) => {
    for (let y = 0; y < 20; y++) f.rect(0, y, W, 1, mix(rgb(96, 150, 250), rgb(176, 210, 255), y / 20));
    for (let r = 2; r < 10; r++)
      for (let c = 0; c < W / BS; c++) {
        const b = blockAt(7, c, r - 2, 999) as Exclude<Block, 'air'>;
        const tx = TEX[b];
        for (let j = 0; j < BS; j++) for (let i = 0; i < BS; i++) f.buf[(r * BS + j) * W + c * BS + i] = shade(tx[j * BS + i], 0.85);
      }
    const title = weeksAgo === 0 ? 'MINING LOG - THIS WEEK' : `MINING LOG - ${weeksAgo} WEEK${weeksAgo > 1 ? 'S' : ''} AGO`;
    text(f, title, Math.round((W - width3(title)) / 2), 7, WHITE);
    days.forEach((d, i) => {
      const x = 10 + i * 27;
      const depth = d.minutes ? Math.max(1, Math.round((d.minutes / Math.max(1, week.maxMinutes)) * MAX_DEPTH)) : 0;
      for (let k = 0; k < depth; k++) f.rect(x, 20 + k * BS, 10, BS, d.selected ? rgb(40, 34, 30) : rgb(26, 24, 24));
      if (depth) f.rect(x, 20 + depth * BS - 2, 10, 2, d.selected ? GOLD : rgb(120, 110, 90));
    });
    f.rect(0, 100, W, 20, rgb(20, 18, 16));
    days.forEach((d, i) => {
      const x = 10 + i * 27;
      const label = d.back === 0 ? 'NOW' : DAY[d.date.getDay()];
      text(f, label, x + 5 - Math.round(width3(label) / 2), 102, d.selected ? GOLD : GREY);
    });
    const sel = days.find(d => d.selected)!;
    const line = sessions.length
      ? `${compact(sel.minutes)}  ${sessions.length} DIG${sessions.length > 1 ? 'S' : ''}  LAST ${hhmm(sessions[0].start)} ${sessions[0].done ? 'CHEST' : 'GAVE UP'}`
      : 'NOTHING DUG';
    text(f, line, 4, 110, WHITE);
    const foot = `WEEK ${compact(week.minutes)}`;
    text(f, foot, W - 4 - width3(foot), 110, GOLD);
  };
  return (
    <div className="mine-root" {...knob}>
      <Screen draw={draw} fps={0} />
    </div>
  );
}
