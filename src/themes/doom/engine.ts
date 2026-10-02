/**
 * A tiny software renderer in the spirit of 1990s shooters: a 200×120
 * framebuffer of 32-bit pixels, scaled ×4 by CSS. Every asset here is
 * original: pixel fonts, procedural textures and the face are drawn in
 * code; the raycaster, the fire and the screen melt are public techniques.
 */
export const W = 200;
export const H = 120;
/** Rows above the status bar. */
export const VIEW_H = 88;

export type Color = number;
export const rgb = (r: number, g: number, b: number): Color => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
const R = (c: Color) => c & 255;
const G = (c: Color) => (c >>> 8) & 255;
const B = (c: Color) => (c >>> 16) & 255;
export const shade = (c: Color, f: number): Color =>
  rgb(Math.min(255, R(c) * f) | 0, Math.min(255, G(c) * f) | 0, Math.min(255, B(c) * f) | 0);
export const mix = (a: Color, b: Color, t: number): Color =>
  rgb((R(a) + (R(b) - R(a)) * t) | 0, (G(a) + (G(b) - G(a)) * t) | 0, (B(a) + (B(b) - B(a)) * t) | 0);

export const BLACK = rgb(0, 0, 0);
export const WHITE = rgb(236, 236, 236);
export const GREY = rgb(150, 150, 150);
export const DIM = rgb(96, 96, 96);
export const RED = rgb(220, 30, 24);
export const YELLOW = rgb(240, 200, 40);

/** Deterministic noise, so textures look the same every run. */
function prng(seed: number) {
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
  /** Blend a band of rows toward `c` by `a` (0–1). */
  tint(c: Color, a: number, y0 = 0, y1 = H) {
    for (let i = y0 * W; i < y1 * W; i++) this.buf[i] = mix(this.buf[i], c, a);
  }
}

// ── pixel fonts (original) ──────────────────────────────────────────────

/** 3×5 font, rows top to bottom, 3 bits each. */
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
  '8': '111101111101111', '9': '111101111001110',
  ':': '000010000010000', '.': '000000000000010', '!': '010010010000010', '?': '110001010000010',
  '-': '000000111000000', '/': '001001010100100', "'": '010010000000000', '%': '101001010100101',
  ',': '000000000010100', '+': '000010111010000', '(': '001010010010001', ')': '100010010010100',
  '>': '100010001010100', ' ': '000000000000000',
};

/** 5×7 font for the big red numbers and titles. */
const F5: Record<string, string[]> = {
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  ':': ['.....', '..#..', '..#..', '.....', '..#..', '..#..', '.....'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

export const width3 = (s: string, scale = 1) => (s.length * 4 - 1) * scale;
export const width5 = (s: string, scale = 1) => (s.length * 6 - 1) * scale;

/** Small text; optional 1px shadow so it reads over the 3D view. */
export function text3(f: Frame, s: string, x: number, y: number, c: Color, scale = 1, shadow = false) {
  [...s.toUpperCase()].forEach((ch, i) => {
    const g = F3[ch] ?? F3['?'];
    for (let r = 0; r < 5; r++)
      for (let k = 0; k < 3; k++)
        if (g[r * 3 + k] === '1') {
          const px = x + (i * 4 + k) * scale;
          const py = y + r * scale;
          if (shadow) f.rect(px + scale, py + scale, scale, scale, BLACK);
          f.rect(px, py, scale, scale, c);
        }
  });
}

/** Big glyphs with a dark outline and a red-to-crimson gradient down the rows. */
export function text5(f: Frame, s: string, x: number, y: number, scale: number, top: Color = rgb(255, 90, 60), bottom: Color = rgb(150, 0, 0)) {
  const on = (g: string[], r: number, k: number) => r >= 0 && r < 7 && k >= 0 && k < 5 && g[r][k] === '#';
  [...s.toUpperCase()].forEach((ch, i) => {
    const g = F5[ch] ?? F5[' '];
    const gx = x + i * 6 * scale;
    for (let r = -1; r <= 7; r++)
      for (let k = -1; k <= 5; k++) {
        if (on(g, r, k)) continue;
        let edge = false;
        for (let dr = -1; dr <= 1 && !edge; dr++) for (let dk = -1; dk <= 1; dk++) if (on(g, r + dr, k + dk)) edge = true;
        if (edge) f.rect(gx + k * scale, y + r * scale, scale, scale, rgb(20, 0, 0));
      }
    for (let r = 0; r < 7; r++) {
      const c = mix(top, bottom, r / 6);
      for (let k = 0; k < 5; k++) if (on(g, r, k)) f.rect(gx + k * scale, y + r * scale, scale, scale, c);
    }
  });
}

// ── textures (procedural, 16×16) ───────────────────────────────────────

const TEX = 16;
function texture(paint: (x: number, y: number, n: () => number) => Color, seed: number): Uint32Array {
  const t = new Uint32Array(TEX * TEX);
  const n = prng(seed);
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) t[y * TEX + x] = paint(x, y, n);
  return t;
}
const BRICK = texture((x, y, n) => {
  const row = y >> 2;
  const mortar = (y & 3) === 3 || ((x + (row & 1) * 4) & 7) === 7;
  return mortar ? rgb(46, 34, 26) : shade(rgb(120, 78, 50), 0.82 + n() * 0.3);
}, 7);
const TECH = texture((x, y, n) => {
  if (x === 0 || y === 0 || x === 15 || y === 15) return rgb(40, 42, 46);
  if (y === 7 && x > 3 && x < 12) return x % 2 ? rgb(60, 220, 90) : rgb(30, 90, 40);
  return shade(rgb(104, 106, 116), 0.85 + n() * 0.25);
}, 11);
const DOOR = texture((x, _y, n) => (x === 0 || x === 15 ? rgb(60, 8, 6) : shade(rgb(150, 20, 16), 0.85 + n() * 0.2)), 5);
const EXIT = (() => {
  const t = texture((_x, _y, n) => shade(rgb(150, 20, 16), 0.85 + n() * 0.2), 5);
  const word = 'EXIT';
  [...word].forEach((ch, i) => {
    const g = F3[ch];
    for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (g[r * 3 + k] === '1') t[(5 + r) * TEX + 1 + i * 4 + k] = rgb(255, 230, 200);
  });
  return t;
})();

// ── the level: a corridor toward the exit ──────────────────────────────

const MAP = [
  '################################################',
  '#....T.......T.......T.......T.......T.........#',
  '#..............................................D',
  '#..............................................E',
  '#..............................................D',
  '#....T.......T.......T.......T.......T.........#',
  '################################################',
];
const MAP_W = MAP[0].length;
const cell = (x: number, y: number) => (y >= 0 && y < MAP.length && x >= 0 && x < MAP_W ? MAP[y][x] : '#');
/** Where the walk starts and stops, in map units. */
export const START_X = 1.6;
export const END_X = MAP_W - 2.4;

/**
 * Classic grid raycaster: one ray per column, DDA through the map, the
 * wall slice scaled by perpendicular distance, then floor and ceiling cast
 * per pixel. Light falls off with distance; `light` dims the whole sector.
 */
export function renderView(f: Frame, px: number, py: number, angle: number, bob: number, light: number) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const planeX = -dy * 0.66;
  const planeY = dx * 0.66;
  const horizon = VIEW_H / 2 + bob;
  const zbuf = new Float32Array(W);

  // floor and ceiling first, so walls draw over them
  for (let y = 0; y < VIEW_H; y++) {
    const p = y - horizon;
    if (Math.abs(p) < 0.5) continue;
    const rowDist = (VIEW_H / 2) / Math.abs(p);
    const fall = light * Math.max(0.12, 1 - rowDist / 12);
    const lx = dx - planeX;
    const ly = dy - planeY;
    const stepX = (rowDist * 2 * planeX) / W;
    const stepY = (rowDist * 2 * planeY) / W;
    let wx = px + rowDist * lx;
    let wy = py + rowDist * ly;
    for (let x = 0; x < W; x++) {
      const tx = Math.floor(wx * 2);
      const ty = Math.floor(wy * 2);
      let c: Color;
      if (p > 0) c = (tx + ty) & 1 ? rgb(70, 58, 44) : rgb(58, 48, 38);
      else c = (Math.floor(wx) % 4 === 0 && Math.abs(wy - 3.5) < 0.8) ? rgb(210, 200, 170) : rgb(52, 52, 58);
      f.buf[y * W + x] = shade(c, fall);
      wx += stepX;
      wy += stepY;
    }
  }

  for (let x = 0; x < W; x++) {
    const cam = (2 * x) / W - 1;
    const rx = dx + planeX * cam;
    const ry = dy + planeY * cam;
    let mx = Math.floor(px);
    let my = Math.floor(py);
    const ddx = Math.abs(1 / rx);
    const ddy = Math.abs(1 / ry);
    const sx = rx < 0 ? -1 : 1;
    const sy = ry < 0 ? -1 : 1;
    let sdx = (rx < 0 ? px - mx : mx + 1 - px) * ddx;
    let sdy = (ry < 0 ? py - my : my + 1 - py) * ddy;
    let side = 0;
    let hit = '.';
    for (let n = 0; n < 128 && hit === '.'; n++) {
      if (sdx < sdy) {
        sdx += ddx;
        mx += sx;
        side = 0;
      } else {
        sdy += ddy;
        my += sy;
        side = 1;
      }
      hit = cell(mx, my);
    }
    const dist = side === 0 ? sdx - ddx : sdy - ddy;
    zbuf[x] = dist;
    const lineH = VIEW_H / Math.max(0.05, dist);
    const top = horizon - lineH / 2;
    let wallX = side === 0 ? py + dist * ry : px + dist * rx;
    wallX -= Math.floor(wallX);
    const tex = hit === 'E' ? EXIT : hit === 'D' ? DOOR : hit === 'T' ? TECH : BRICK;
    const tx = Math.min(TEX - 1, (wallX * TEX) | 0);
    const fall = light * Math.max(0.15, 1 - dist / 16) * (side ? 0.78 : 1);
    const y0 = Math.max(0, Math.ceil(top));
    const y1 = Math.min(VIEW_H, Math.floor(top + lineH));
    for (let y = y0; y < y1; y++) {
      const ty = Math.min(TEX - 1, (((y - top) / lineH) * TEX) | 0);
      f.buf[y * W + x] = shade(tex[ty * TEX + tx], hit === 'E' || hit === 'D' ? Math.max(fall, 0.7) : fall);
    }
  }
  return zbuf;
}

// ── title fire ─────────────────────────────────────────────────────────

const FIRE_MAX = 36;
const FIRE_PALETTE: Color[] = Array.from({ length: FIRE_MAX + 1 }, (_, i) => {
  const t = i / FIRE_MAX;
  if (t < 0.25) return mix(rgb(7, 7, 7), rgb(120, 16, 8), t / 0.25);
  if (t < 0.55) return mix(rgb(120, 16, 8), rgb(220, 70, 10), (t - 0.25) / 0.3);
  if (t < 0.85) return mix(rgb(220, 70, 10), rgb(240, 190, 40), (t - 0.55) / 0.3);
  return mix(rgb(240, 190, 40), rgb(255, 255, 230), (t - 0.85) / 0.15);
});

/** The PSX-style fire: heat pulled up from the row below with a little sideways wander. */
export class Fire {
  readonly h: number;
  readonly heat: Uint8Array;
  constructor(h: number) {
    this.h = h;
    this.heat = new Uint8Array(W * h);
  }
  step(strength: number) {
    const { heat, h } = this;
    for (let x = 0; x < W; x++) heat[(h - 1) * W + x] = Math.random() < strength ? FIRE_MAX : (heat[(h - 1) * W + x] * 0.9) | 0;
    for (let y = 0; y < h - 1; y++)
      for (let x = 0; x < W; x++) {
        const sx = Math.min(W - 1, Math.max(0, x + ((Math.random() * 3) | 0) - 1));
        const v = heat[(y + 1) * W + sx] - ((Math.random() * 2.4) | 0);
        heat[y * W + x] = v > 0 ? v : 0;
      }
  }
  draw(f: Frame, y0: number) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < W; x++) {
        const v = this.heat[y * W + x];
        if (v > 1) f.buf[(y0 + y) * W + x] = FIRE_PALETTE[v];
      }
  }
}

// ── screen melt ────────────────────────────────────────────────────────

/** Column offsets for the wipe: each column waits a little, neighbours close together. */
export function meltOffsets(): Int16Array {
  const o = new Int16Array(W / 2);
  o[0] = -((Math.random() * 16) | 0);
  for (let i = 1; i < o.length; i++) o[i] = Math.max(-15, Math.min(0, o[i - 1] + ((Math.random() * 3) | 0) - 1));
  return o;
}
/** Draw the old frame sliding down in 2-px columns over whatever is in `f`. */
export function melt(f: Frame, old: Uint32Array, offsets: Int16Array, elapsedMs: number): boolean {
  let busy = false;
  for (let c = 0; c < offsets.length; c++) {
    const shift = Math.max(0, Math.floor((elapsedMs / 16 + offsets[c]) * 4));
    if (shift >= H) continue;
    busy = true;
    for (let k = 0; k < 2; k++) {
      const x = c * 2 + k;
      for (let y = H - 1 - shift; y >= 0; y--) f.buf[(y + shift) * W + x] = old[y * W + x];
    }
  }
  return busy;
}

// ── status-bar face (original: a tomato in a helmet) ───────────────────

export type Mood = 'grin' | 'calm' | 'tense' | 'hurt' | 'cool' | 'sleep';

export function face(f: Frame, x0: number, y0: number, mood: Mood, look: -1 | 0 | 1) {
  const cx = x0 + 12;
  const cy = y0 + 14;
  for (let y = -10; y <= 10; y++)
    for (let x = -11; x <= 11; x++) {
      const d = (x / 11) ** 2 + (y / 10) ** 2;
      if (d > 1) continue;
      const rim = d > 0.82;
      let c = rim ? rgb(110, 14, 10) : mix(rgb(230, 60, 40), rgb(170, 24, 16), (y + 10) / 20);
      if (x < -5 && y < -4 && d < 0.55) c = rgb(250, 120, 100);
      f.px(cx + x, cy + y, c);
    }
  // helmet band and stem
  f.rect(cx - 9, cy - 9, 19, 3, rgb(70, 86, 60));
  f.rect(cx - 9, cy - 9, 19, 1, rgb(110, 130, 90));
  f.rect(cx - 1, cy - 13, 3, 4, rgb(60, 140, 50));
  f.rect(cx - 4, cy - 11, 9, 1, rgb(60, 140, 50));
  const ex = look * 2;
  if (mood === 'sleep') {
    f.rect(cx - 6, cy - 2, 4, 1, BLACK);
    f.rect(cx + 3, cy - 2, 4, 1, BLACK);
  } else if (mood === 'cool') {
    f.rect(cx - 8, cy - 4, 7, 3, BLACK);
    f.rect(cx + 2, cy - 4, 7, 3, BLACK);
    f.rect(cx - 1, cy - 4, 3, 1, BLACK);
  } else {
    f.rect(cx - 6, cy - 4, 4, 3, WHITE);
    f.rect(cx + 3, cy - 4, 4, 3, WHITE);
    f.rect(cx - 5 + ex, cy - 3, 2, 2, BLACK);
    f.rect(cx + 4 + ex, cy - 3, 2, 2, BLACK);
    if (mood === 'tense' || mood === 'hurt') {
      f.rect(cx - 7, cy - 6, 4, 1, BLACK);
      f.rect(cx + 4, cy - 6, 4, 1, BLACK);
    }
  }
  if (mood === 'grin' || mood === 'cool') {
    f.rect(cx - 4, cy + 4, 9, 1, BLACK);
    f.rect(cx - 3, cy + 5, 7, 2, WHITE);
    f.rect(cx - 3, cy + 7, 7, 1, BLACK);
  } else if (mood === 'calm' || mood === 'sleep') {
    f.rect(cx - 3, cy + 5, 7, 1, BLACK);
  } else {
    f.rect(cx - 4, cy + 4, 9, 4, BLACK);
    f.rect(cx - 3, cy + 5, 7, 2, WHITE);
    if (mood === 'hurt') f.rect(cx + 8, cy - 2, 1, 3, rgb(140, 200, 255));
  }
}

// ── status bar ─────────────────────────────────────────────────────────

const STONE = texture((_x, _y, n) => shade(rgb(92, 90, 86), 0.8 + n() * 0.35), 3);

/** The bar's stone body and bevelled panels; callers fill in the numbers. */
export function statusBar(f: Frame) {
  for (let y = VIEW_H; y < H; y++) for (let x = 0; x < W; x++) f.buf[y * W + x] = STONE[((y - VIEW_H) & 15) * TEX + (x & 15)];
  f.rect(0, VIEW_H, W, 1, rgb(150, 148, 140));
  const panel = (x: number, w: number) => {
    f.rect(x, VIEW_H + 3, w, H - VIEW_H - 6, rgb(52, 50, 48));
    f.rect(x, VIEW_H + 3, w, 1, rgb(30, 28, 26));
    f.rect(x, H - 4, w, 1, rgb(140, 138, 130));
  };
  panel(2, 40);
  panel(46, 44);
  panel(94, 26);
  panel(124, 40);
  panel(168, 30);
}

export const KEY_COLORS: Color[] = [rgb(60, 110, 255), rgb(240, 200, 40), rgb(230, 40, 30), rgb(60, 200, 80)];
export function keycard(f: Frame, x: number, y: number, c: Color, filled: boolean) {
  if (filled) {
    f.rect(x, y, 9, 5, c);
    f.rect(x + 1, y + 1, 3, 3, shade(c, 0.55));
  } else {
    f.rect(x, y, 9, 1, shade(c, 0.6));
    f.rect(x, y + 4, 9, 1, shade(c, 0.6));
    f.rect(x, y, 1, 5, shade(c, 0.6));
    f.rect(x + 8, y, 1, 5, shade(c, 0.6));
  }
}
