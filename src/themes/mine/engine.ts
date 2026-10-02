/**
 * Mineshaft renderer: a 200×120 framebuffer scaled ×4, 10-pixel blocks.
 * All art is original and procedural: block textures, items, the miner
 * (the app's tomato, in a helmet), and a home-made pixel font.
 */
export const W = 200;
export const H = 120;
/** Block size in pixels. */
export const BS = 10;
export const COLS = W / BS;

export type Color = number;
export const rgb = (r: number, g: number, b: number): Color =>
  ((255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
const R = (c: Color) => c & 255;
const G = (c: Color) => (c >>> 8) & 255;
const B = (c: Color) => (c >>> 16) & 255;
const c8 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
export const shade = (c: Color, f: number): Color => rgb(c8(R(c) * f), c8(G(c) * f), c8(B(c) * f));
export const mix = (a: Color, b: Color, t: number): Color =>
  rgb(c8(R(a) + (R(b) - R(a)) * t), c8(G(a) + (G(b) - G(a)) * t), c8(B(a) + (B(b) - B(a)) * t));

export const BLACK = rgb(0, 0, 0);
export const WHITE = rgb(250, 250, 250);
export const SHADOW = rgb(40, 40, 40);
export const GOLD = rgb(252, 214, 64);
export const GREY = rgb(170, 170, 170);

export function prng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Frame {
  readonly img: ImageData;
  readonly buf: Uint32Array;
  constructor(ctx: CanvasRenderingContext2D) {
    this.img = ctx.createImageData(W, H);
    this.buf = new Uint32Array(this.img.data.buffer);
  }
  fill(c: Color) {
    this.buf.fill(c);
  }
  px(x: number, y: number, c: Color) {
    if (x >= 0 && x < W && y >= 0 && y < H) this.buf[(y | 0) * W + (x | 0)] = c;
  }
  rect(x: number, y: number, w: number, h: number, c: Color) {
    for (let j = Math.max(0, y | 0); j < Math.min(H, (y + h) | 0); j++)
      for (let i = Math.max(0, x | 0); i < Math.min(W, (x + w) | 0); i++) this.buf[j * W + i] = c;
  }
  /** Multiply a rectangle's brightness (for lighting). */
  dim(x: number, y: number, w: number, h: number, f: number) {
    if (f >= 0.999) return;
    for (let j = Math.max(0, y | 0); j < Math.min(H, (y + h) | 0); j++)
      for (let i = Math.max(0, x | 0); i < Math.min(W, (x + w) | 0); i++) this.buf[j * W + i] = shade(this.buf[j * W + i], f);
  }
}

// ── pixel fonts (original) ─────────────────────────────────────────────

const F3: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111101101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101101111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010',
  '8': '111101111101111', '9': '111101111001110', ':': '000010000010000', '.': '000000000000010',
  '!': '010010010000010', '?': '110001010000010', '-': '000000111000000', '/': '001001010100100',
  "'": '010010000000000', ',': '000000000010100', '+': '000010111010000', '[': '110100100100110',
  ']': '011001001001011', '>': '100010001010100', ' ': '000000000000000',
};
const D5: Record<string, string> = {
  '0': '.###.#...##..###.#.###..##...#.###.', '1': '..#...##....#....#....#....#...###.',
  '2': '.###.#...#....#...#...#...#...#####', '3': '#####...#...#.....#.....##...#.###.',
  '4': '...#...##..#.#.#..#.#####...#....#.', '5': '######....####.....#....##...#.###.',
  '6': '..##..#...#....####.#...##...#.###.', '7': '#####....#...#...#...#....#....#...',
  '8': '.###.#...##...#.###.#...##...#.###.', '9': '.###.#...##...#.####....#...#..##..',
  ':': '.......#....#.........#....#.......',
};

export const width3 = (s: string, k = 1) => (s.length * 4 - 1) * k;
export const width5 = (s: string, k = 1) => (s.length * 6 - 1) * k;

/** Small text with the drop shadow a block game's UI uses. */
export function text(f: Frame, s: string, x: number, y: number, c: Color = WHITE, k = 1) {
  [...s.toUpperCase()].forEach((ch, i) => {
    const g = F3[ch] ?? F3['?'];
    for (let r = 0; r < 5; r++)
      for (let q = 0; q < 3; q++)
        if (g[r * 3 + q] === '1') {
          f.rect(x + (i * 4 + q) * k + k, y + r * k + k, k, k, shade(c, 0.25));
          f.rect(x + (i * 4 + q) * k, y + r * k, k, k, c);
        }
  });
}
/** Big digits, same shadow. */
export function digits(f: Frame, s: string, x: number, y: number, k: number, c: Color = WHITE) {
  [...s].forEach((ch, i) => {
    const g = D5[ch] ?? D5['0'];
    for (let r = 0; r < 7; r++)
      for (let q = 0; q < 5; q++)
        if (g[r * 5 + q] === '#') {
          f.rect(x + (i * 6 + q) * k + k, y + r * k + k, k, k, shade(c, 0.25));
          f.rect(x + (i * 6 + q) * k, y + r * k, k, k, c);
        }
  });
}

// ── block textures (procedural, 10×10) ─────────────────────────────────

export type Block = 'air' | 'grass' | 'dirt' | 'stone' | 'deep' | 'coal' | 'iron' | 'gold' | 'diamond' | 'bedrock' | 'chest';
type Tex = Uint32Array;

function tex(seed: number, paint: (x: number, y: number, n: () => number) => Color): Tex {
  const t = new Uint32Array(BS * BS);
  const n = prng(seed);
  for (let y = 0; y < BS; y++) for (let x = 0; x < BS; x++) t[y * BS + x] = paint(x, y, n);
  return t;
}
const speckled = (seed: number, base: Color, spread: number) => tex(seed, (_x, _y, n) => shade(base, 1 - spread / 2 + n() * spread));
/** Stone with clusters of an ore colour. */
const ore = (seed: number, host: Color, fleck: Color) => {
  const spots = prng(seed + 1);
  const pts = Array.from({ length: 4 }, () => [1 + spots() * 7, 1 + spots() * 7]);
  return tex(seed, (x, y, n) => {
    for (const [px, py] of pts) if (Math.abs(x - px) + Math.abs(y - py) < 1.6) return shade(fleck, 0.85 + n() * 0.3);
    return shade(host, 0.85 + n() * 0.3);
  });
};
const STONE = rgb(128, 128, 130);
const DEEP = rgb(76, 76, 84);
export const TEX: Record<Exclude<Block, 'air'>, Tex> = {
  grass: tex(1, (_x, y, n) => (y < 3 ? shade(rgb(96, 160, 56), 0.85 + n() * 0.3) : shade(rgb(134, 96, 62), 0.85 + n() * 0.3))),
  dirt: speckled(2, rgb(134, 96, 62), 0.3),
  stone: speckled(3, STONE, 0.3),
  deep: speckled(4, DEEP, 0.3),
  coal: ore(5, STONE, rgb(30, 30, 30)),
  iron: ore(7, STONE, rgb(214, 170, 140)),
  gold: ore(9, STONE, rgb(250, 210, 60)),
  diamond: ore(11, DEEP, rgb(90, 230, 220)),
  bedrock: tex(13, (_x, _y, n) => (n() < 0.5 ? rgb(40, 40, 40) : rgb(96, 96, 96))),
  chest: tex(15, (x, y) => {
    if (x === 0 || x === 9 || y === 0 || y === 9) return rgb(70, 44, 18);
    if (y === 4) return rgb(70, 44, 18);
    if (y >= 3 && y <= 5 && x >= 4 && x <= 5) return GOLD;
    return rgb(170, 112, 50);
  }),
};

// ── the world: a column of ground under the miner ──────────────────────

/** Column the shaft is dug in. */
export const SHAFT = 9;

/**
 * Deterministic ground for a session: grass, three dirt layers, stone with
 * coal and iron, gold lower down, deepslate with diamonds deeper still.
 * The chest sits at the target depth in the shaft.
 */
export function blockAt(seed: number, x: number, depth: number, target: number): Block {
  if (depth < 0) return 'air';
  if (x === SHAFT && depth === target) return 'chest';
  if (depth === 0) return 'grass';
  if (depth <= 3) return 'dirt';
  if (depth >= 64) return 'bedrock';
  const n = prng(seed ^ (x * 7919) ^ (depth * 104729))();
  const deep = depth >= 30;
  if (n < 0.06 && depth > 4 && depth < 40) return 'coal';
  if (n < 0.1 && depth > 8) return 'iron';
  if (n < 0.125 && depth > 16) return 'gold';
  if (n < 0.14 && depth > 26) return 'diamond';
  return deep ? 'deep' : 'stone';
}

/** Cracks spreading over a block as the minute passes (0–1). */
export function cracks(f: Frame, x: number, y: number, amount: number) {
  if (amount <= 0) return;
  const lines: [number, number][][] = [
    [[4, 4], [5, 5], [6, 5], [7, 6]],
    [[4, 4], [3, 5], [2, 6], [2, 7]],
    [[5, 3], [5, 2], [6, 1]],
    [[6, 5], [7, 7], [8, 8]],
    [[3, 5], [3, 7], [4, 8]],
    [[4, 4], [2, 3], [1, 2]],
    [[6, 1], [8, 1]],
    [[2, 7], [1, 9]],
  ];
  const n = Math.ceil(amount * lines.length);
  for (let i = 0; i < n; i++) for (const [px, py] of lines[i]) f.px(x + px, y + py, rgb(24, 24, 24));
}

// ── the miner: the app's tomato in a helmet ────────────────────────────

/** Draws a 10×10 miner; `swing` alternates the pickaxe; `asleep` lies down. */
export function miner(f: Frame, x: number, y: number, swing: boolean, asleep = false) {
  const body = (px: number, py: number, c: Color) => f.px(x + px, y + py, c);
  if (asleep) {
    for (let i = 1; i < 9; i++) for (let j = 5; j < 9; j++) body(i, j, i < 3 ? rgb(230, 60, 40) : rgb(200, 40, 40));
    body(1, 6, BLACK);
    return;
  }
  const red = rgb(226, 58, 40);
  for (let j = 3; j < 10; j++) for (let i = 1; i < 8; i++) if (!((j === 3 || j === 9) && (i === 1 || i === 7))) body(i, j, j > 7 ? shade(red, 0.75) : red);
  for (let i = 0; i < 9; i++) body(i, 2, GOLD);
  for (let i = 1; i < 8; i++) body(i, 1, GOLD);
  body(4, 1, WHITE);
  body(3, 5, BLACK);
  body(6, 5, BLACK);
  body(4, 7, BLACK);
  body(5, 7, BLACK);
  // pickaxe: handle and head, raised or down
  const wood = rgb(140, 96, 52);
  const iron = rgb(200, 200, 210);
  if (swing) {
    for (let i = 0; i < 4; i++) body(8 + i, 6 - i, wood);
    body(10, 1, iron); body(11, 2, iron); body(12, 3, iron); body(9, 1, iron);
  } else {
    for (let i = 0; i < 4; i++) body(7 + i, 7 + (i >> 1), wood);
    body(9, 10, iron); body(10, 10, iron); body(11, 9, iron); body(8, 10, iron);
  }
}

// ── items and HUD ──────────────────────────────────────────────────────

export type Item = 'pick' | 'diamond' | 'coal' | 'emerald';
export function item(f: Frame, kind: Item, x: number, y: number) {
  const p = (px: number, py: number, c: Color) => f.px(x + px, y + py, c);
  if (kind === 'diamond' || kind === 'emerald') {
    const c = kind === 'diamond' ? rgb(90, 230, 220) : rgb(60, 210, 100);
    const rows = ['..##..', '.####.', '######', '.####.', '..##..'];
    rows.forEach((r, j) => [...r].forEach((ch, i) => ch === '#' && p(i + 1, j + 1, j < 2 ? shade(c, 1.2) : c)));
  } else if (kind === 'coal') {
    const rows = ['.###..', '#####.', '######', '.####.', '..##..'];
    rows.forEach((r, j) => [...r].forEach((ch, i) => ch === '#' && p(i + 1, j + 1, (i + j) % 3 ? rgb(40, 40, 40) : rgb(80, 80, 80))));
  } else {
    for (let i = 0; i < 5; i++) p(1 + i, 6 - i, rgb(140, 96, 52));
    p(4, 0, rgb(200, 200, 210)); p(5, 1, rgb(200, 200, 210)); p(6, 2, rgb(200, 200, 210)); p(3, 0, rgb(200, 200, 210)); p(6, 3, rgb(200, 200, 210));
  }
}

export function heart(f: Frame, x: number, y: number, state: 'full' | 'half' | 'empty') {
  const rows = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
  rows.forEach((r, j) =>
    [...r].forEach((ch, i) => {
      if (ch !== '#') return;
      const lit = state === 'full' || (state === 'half' && i < 4);
      f.px(x + i, y + j, lit ? (j === 1 && i < 3 ? rgb(255, 120, 120) : rgb(220, 30, 30)) : rgb(60, 20, 20));
    }),
  );
}

/** Nine-slot hotbar; slots get an item and a count. */
export function hotbar(f: Frame, slots: { kind: Item; count?: number }[], selected: number) {
  const x0 = Math.round((W - 9 * 12 - 1) / 2);
  const y0 = H - 14;
  f.rect(x0, y0, 9 * 12 + 1, 14, rgb(30, 30, 30));
  for (let i = 0; i < 9; i++) {
    const x = x0 + 1 + i * 12;
    f.rect(x, y0 + 1, 11, 12, rgb(118, 118, 118));
    f.rect(x + 1, y0 + 2, 9, 10, rgb(88, 88, 88));
    const s = slots[i];
    if (s) {
      item(f, s.kind, x + 2, y0 + 3);
      if (s.count !== undefined) {
        const n = String(s.count);
        text(f, n, x + 11 - width3(n), y0 + 8);
      }
    }
  }
  const sx = x0 + selected * 12;
  f.rect(sx, y0 - 1, 13, 1, WHITE);
  f.rect(sx, y0 + 14, 13, 1, WHITE);
  f.rect(sx, y0 - 1, 1, 16, WHITE);
  f.rect(sx + 12, y0 - 1, 1, 16, WHITE);
}
