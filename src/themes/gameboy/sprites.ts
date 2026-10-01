import type { Sprite } from './engine';

type Grid = string[][];
const blank = (): Grid => Array.from({ length: 16 }, () => Array(16).fill('.'));
const toSprite = (g: Grid): Sprite => g.map(r => r.join(''));
const put = (g: Grid, pts: [number, number][], shade: string) => {
  for (const [x, y] of pts) if (x >= 0 && x < 16 && y >= 0 && y < 16) g[y][x] = shade;
};

/** Filled ellipse with a one-pixel dark rim. */
function blob(g: Grid, cx: number, cy: number, rx: number, ry: number, fill: string) {
  const inside = (x: number, y: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      if (!inside(x, y)) continue;
      const rim = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      g[y][x] = rim ? '3' : fill;
    }
}

/** The hero. Asleep on breaks. */
export function tomato(asleep: boolean): Sprite {
  const g = blank();
  blob(g, 7.5, 9.5, 7.2, 6.2, '2');
  put(g, [[4, 6], [5, 6], [4, 7]], '1');
  put(g, [[7, 0], [7, 1], [8, 1], [4, 2], [5, 2], [6, 3], [7, 2], [8, 2], [9, 3], [10, 2], [11, 2]], '3');
  if (asleep) {
    put(g, [[4, 10], [5, 10], [10, 10], [11, 10], [7, 13], [8, 13]], '0');
  } else {
    put(g, [[5, 9], [5, 10], [10, 9], [10, 10], [6, 12], [7, 13], [8, 13], [9, 12]], '0');
  }
  return toSprite(g);
}

/** WORK: an angry alarm clock whose hand sweeps down with the time left. */
export function alarmClock(frac: number): Sprite {
  const g = blank();
  blob(g, 2.5, 2.5, 2.4, 2.4, '2');
  blob(g, 12.5, 2.5, 2.4, 2.4, '2');
  blob(g, 7.5, 8.5, 6.8, 6.8, '1');
  put(g, [[3, 15], [4, 15], [11, 15], [12, 15], [7, 1], [8, 1]], '3');
  // angry brows and eyes
  put(g, [[4, 5], [5, 6], [11, 5], [10, 6], [5, 7], [10, 7]], '3');
  // hand: 12 o'clock is up, sweeping clockwise to the time remaining
  const a = frac * 2 * Math.PI;
  for (let t = 0; t <= 4.6; t += 0.4) {
    put(g, [[Math.round(7.5 + Math.sin(a) * t - 0.5), Math.round(9 - Math.cos(a) * t)]], '2');
  }
  put(g, [[7, 9]], '3');
  return toSprite(g);
}

/** The break "opponent". Steam drifts on alternate frames. */
export function coffee(frame: number): Sprite {
  const steam = frame % 2 ? ['.....2..2..2....', '....2..2..2.....', '.....2..2..2....'] : ['....2..2..2.....', '.....2..2..2....', '....2..2..2.....'];
  return [
    ...steam,
    '................',
    '..3333333333....',
    '..3000000003333.',
    '..3011111103..3.',
    '..3011111103..3.',
    '..3011111103..3.',
    '..3011111103333.',
    '..3011111103....',
    '...30111103.....',
    '....300003......',
    '..333333333333..',
    '................',
    '................',
  ];
}

export const HEART_FULL: Sprite = ['.33.33.', '3333333', '3333333', '.33333.', '..333..', '...3...'];
export const HEART_EMPTY: Sprite = ['.33.33.', '3..3..3', '3.....3', '.3...3.', '..3.3..', '...3...'];
