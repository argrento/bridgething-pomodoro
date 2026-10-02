import { formatDuration, hhmm } from '../kit';
import type { HistoryView } from '../types';
import { BLACK, DIM, GREY, H, RED, rgb, text3, W, WHITE, width3, YELLOW, type Frame } from './engine';
import Screen from './Screen';

const DAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const BAR_X = 78;
const BAR_W = 82;

const compact = (min: number) => formatDuration(min).replace(' ', '').toUpperCase();

/** The week as an episode: one level per day, its focus as a bar, the chosen day's sessions below. */
export default function History({ days, sessions, week, streak, weeksAgo, knob }: HistoryView) {
  const max = Math.max(60, week.maxMinutes);
  const draw = (f: Frame) => {
    f.fill(BLACK);
    for (let y = 0; y < H; y++) f.rect(0, y, W, 1, rgb(18 + ((y * 26) / H) | 0, 2, 2));
    const title = weeksAgo === 0 ? 'EPISODE: THIS WEEK' : `EPISODE: ${weeksAgo} WEEK${weeksAgo > 1 ? 'S' : ''} AGO`;
    text3(f, title, Math.round((W - width3(title, 2)) / 2), 4, RED, 2, true);
    days.forEach((d, i) => {
      const y = 20 + i * 9;
      const c = d.selected ? WHITE : GREY;
      if (d.selected) text3(f, '>', 3, y, YELLOW);
      text3(f, d.back === 0 ? 'TODAY' : `${DAY[d.date.getDay()]} ${d.date.getDate()}`, 10, y, c);
      text3(f, `E${weeksAgo + 1}M${i + 1}`, 48, y, d.selected ? YELLOW : DIM);
      const w = Math.round((d.minutes / max) * BAR_W);
      for (let k = 0; k < w; k++) f.rect(BAR_X + k, y, 1, 5, k % 3 === 2 ? rgb(90, 10, 6) : d.selected ? rgb(240, 60, 30) : rgb(170, 30, 20));
      const val = d.minutes ? compact(d.minutes) : '-';
      text3(f, val, W - 4 - width3(val), y, c);
    });
    f.rect(4, 85, W - 8, 1, rgb(90, 20, 14));
    const lines = sessions.length
      ? sessions.slice(0, 3).map(s => `${hhmm(s.start)}-${hhmm(s.end)}  ${String(s.minutes).padStart(3)}M  ${s.done ? 'CLEARED' : 'ABORTED'}`)
      : ['NO KILLS THAT DAY'];
    lines.forEach((l, i) => text3(f, l, 10, 89 + i * 7, i === 0 ? WHITE : GREY));
    const foot = `WEEK ${compact(week.minutes)}  ${week.sessions} KILLS  STREAK ${streak}`;
    text3(f, foot, Math.round((W - width3(foot)) / 2), H - 7, DIM);
  };
  return (
    <div className="doom-root" {...knob}>
      <Screen draw={draw} animating={false} wipe={0} />
    </div>
  );
}
