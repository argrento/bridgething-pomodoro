/**
 * Backrooms renderer: a 240×144 framebuffer, upscaled smoothly so it reads
 * like camcorder video. Everything is drawn in code: procedural wallpaper,
 * carpet, ceiling tiles and pool tiles, a home-made 5×7 OSD font, a grid
 * raycaster, and VHS artefacts (colour fringe, noise, tracking glitches).
 */
export const W = 240;
export const H = 144;

export type Color = number;
export const rgb = (r: number, g: number, b: number): Color =>
  ((255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
const R = (c: Color) => c & 255;
const G = (c: Color) => (c >>> 8) & 255;
const B = (c: Color) => (c >>> 16) & 255;
const clamp8 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
export const shade = (c: Color, f: number): Color => rgb(clamp8(R(c) * f), clamp8(G(c) * f), clamp8(B(c) * f));
export const mix = (a: Color, b: Color, t: number): Color =>
  rgb(clamp8(R(a) + (R(b) - R(a)) * t), clamp8(G(a) + (G(b) - G(a)) * t), clamp8(B(a) + (B(b) - B(a)) * t));

export const BLACK = rgb(0, 0, 0);
export const WHITE = rgb(245, 245, 240);
export const REC_RED = rgb(240, 40, 30);
export const VCR_BLUE = rgb(24, 34, 168);

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
  rect(x: number, y: number, w: number, h: number, c: Color) {
    for (let j = Math.max(0, y | 0); j < Math.min(H, (y + h) | 0); j++)
      for (let i = Math.max(0, x | 0); i < Math.min(W, (x + w) | 0); i++) this.buf[j * W + i] = c;
  }
}

// ── 5×7 OSD font (original) ────────────────────────────────────────────

const F: Record<string, string> = {
  A: '.###.#...##...#######...##...##...#', B: '####.#...##...#####.#...##...#####.',
  C: '.###.#...##....#....#....#...#.###.', D: '####.#...##...##...##...##...#####.',
  E: '######....#....####.#....#....#####', F: '######....#....####.#....#....#....',
  G: '.###.#...##....#.####...##...#.####', H: '#...##...##...#######...##...##...#',
  I: '.###...#....#....#....#....#...###.', J: '..###...#....#....#....##..#..##...',
  K: '#...##..#.#.#..##...#.#..#..#.#...#', L: '#....#....#....#....#....#....#####',
  M: '#...###.###.#.##.#.##...##...##...#', N: '#...###..##.#.##..###...##...##...#',
  O: '.###.#...##...##...##...##...#.###.', P: '####.#...##...#####.#....#....#....',
  Q: '.###.#...##...##...##.#.##..#..##.#', R: '####.#...##...#####.#.#..#..#.#...#',
  S: '.#####....#.....###.....#....#####.', T: '#####..#....#....#....#....#....#..',
  U: '#...##...##...##...##...##...#.###.', V: '#...##...##...##...##...#.#.#...#..',
  W: '#...##...##...##.#.##.#.###.###...#', X: '#...##...#.#.#...#...#.#.#...##...#',
  Y: '#...##...#.#.#...#....#....#....#..', Z: '#####....#...#...#...#...#....#####',
  '0': '.###.#...##..###.#.###..##...#.###.', '1': '..#...##....#....#....#....#...###.',
  '2': '.###.#...#....#...#...#...#...#####', '3': '#####...#...#.....#.....##...#.###.',
  '4': '...#...##..#.#.#..#.#####...#....#.', '5': '######....####.....#....##...#.###.',
  '6': '..##..#...#....####.#...##...#.###.', '7': '#####....#...#...#...#....#....#...',
  '8': '.###.#...##...#.###.#...##...#.###.', '9': '.###.#...##...#.####....#...#..##..',
  ':': '.......#....#.........#....#.......', '.': '..........................##...##..',
  '-': '................###................', '/': '....#...#....#...#....#...#....#...',
  '!': '..#....#....#....#....#.........#..', '?': '.###.#...#....#...#...#.........#..',
  "'": '..#....#...........................', ',': '.....................##....#...#...',
  '>': '.#....##...###..####..###..##...#..', '|': '.#.#..#.#..#.#..#.#..#.#..#.#..#.#.',
  '#': '.....#####.#####.#####.#####.#####.', ' ': '...................................',
};

export const textWidth = (s: string, scale = 1) => (s.length * 6 - 1) * scale;

/** Camcorder OSD text: white with a hard black shadow. */
export function osd(f: Frame, s: string, x: number, y: number, scale = 1, c: Color = WHITE, shadow = true) {
  [...s.toUpperCase()].forEach((ch, i) => {
    const g = F[ch] ?? F['?'];
    for (let r = 0; r < 7; r++)
      for (let k = 0; k < 5; k++)
        if (g[r * 5 + k] === '#') {
          const px = x + (i * 6 + k) * scale;
          const py = y + r * scale;
          if (shadow) f.rect(px + Math.max(1, scale >> 1), py + Math.max(1, scale >> 1), scale, scale, BLACK);
          f.rect(px, py, scale, scale, c);
        }
  });
}

// ── textures ───────────────────────────────────────────────────────────

const TS = 32;
function texture(paint: (x: number, y: number, n: () => number) => Color, seed: number): Uint32Array {
  const t = new Uint32Array(TS * TS);
  const n = prng(seed);
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) t[y * TS + x] = paint(x, y, n);
  return t;
}

/** Mono-yellow wallpaper: faint stripes, a small repeating motif, stains, a baseboard. */
const WALLPAPER = (() => {
  const stains = prng(91);
  const blots = Array.from({ length: 4 }, () => ({ x: stains() * TS, y: stains() * TS, r: 3 + stains() * 6 }));
  return texture((x, y, n) => {
    if (y >= TS - 3) return rgb(120, 100, 52);
    let c = x % 4 < 2 ? rgb(204, 186, 104) : rgb(196, 178, 98);
    if ((x + 2) % 8 === 0 && y % 8 === 4) c = rgb(176, 156, 82);
    if ((x + 2) % 8 === 0 && (y % 8 === 3 || y % 8 === 5)) c = rgb(186, 166, 90);
    for (const b of blots) if ((x - b.x) ** 2 + (y - b.y) ** 2 < b.r * b.r) c = shade(c, 0.9);
    return shade(c, 0.94 + n() * 0.1);
  }, 17);
})();
const POOL_TILE = texture((x, y, n) => (x % 8 === 0 || y % 8 === 0 ? rgb(176, 196, 204) : shade(rgb(232, 240, 242), 0.97 + n() * 0.04)), 23);

// ── maps ───────────────────────────────────────────────────────────────

export type Level = 'office' | 'pool';
const SIZE = 24;
/** A ring corridor two cells in from the border stays clear for the walk; rooms grow around it. */
function makeMap(seed: number, density: number): string[] {
  const n = prng(seed);
  const g = Array.from({ length: SIZE }, (_, y) =>
    Array.from({ length: SIZE }, (_, x) => (x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1 ? '#' : '.')),
  );
  const onRing = (x: number, y: number) =>
    ((x >= 1 && x <= 3) || (x >= SIZE - 4 && x <= SIZE - 2) || (y >= 1 && y <= 3) || (y >= SIZE - 4 && y <= SIZE - 2)) &&
    x > 0 && y > 0 && x < SIZE - 1 && y < SIZE - 1;
  for (let k = 0; k < density; k++) {
    const x = 1 + Math.floor(n() * (SIZE - 2));
    const y = 1 + Math.floor(n() * (SIZE - 2));
    const horiz = n() < 0.5;
    const len = 1 + Math.floor(n() * 4);
    for (let i = 0; i < len; i++) {
      const cx = horiz ? x + i : x;
      const cy = horiz ? y : y + i;
      if (cx < SIZE - 1 && cy < SIZE - 1 && !onRing(cx, cy)) g[cy][cx] = '#';
    }
  }
  // pillars along the ring's inner edge make the walk feel like passing rooms
  for (let i = 5; i < SIZE - 5; i += 4) {
    g[4][i] = '#';
    g[SIZE - 5][i] = '#';
    g[i][4] = '#';
    g[i][SIZE - 5] = '#';
  }
  return g.map(r => r.join(''));
}
const MAPS: Record<Level, string[]> = { office: makeMap(7, 70), pool: makeMap(29, 26) };

/** The walk: once round the ring per phase, turning smoothly at the corners. */
const RING = [
  [2.5, 2.5],
  [SIZE - 2.5, 2.5],
  [SIZE - 2.5, SIZE - 2.5],
  [2.5, SIZE - 2.5],
] as const;
export function walk(progress: number): { x: number; y: number; angle: number } {
  const seg = SIZE - 5;
  const d = (((progress % 1) + 1) % 1) * seg * 4;
  const i = Math.floor(d / seg);
  const t = (d - i * seg) / seg;
  const [ax, ay] = RING[i];
  const [bx, by] = RING[(i + 1) % 4];
  const heading = (k: number) => Math.atan2(RING[(k + 1) % 4][1] - RING[k][1], RING[(k + 1) % 4][0] - RING[k][0]);
  let angle = heading(i);
  // ease into the next corner over the last 12% of a side
  if (t > 0.88) {
    let to = heading((i + 1) % 4);
    if (to - angle > Math.PI) to -= 2 * Math.PI;
    if (to - angle < -Math.PI) to += 2 * Math.PI;
    const e = (t - 0.88) / 0.12;
    angle += (to - angle) * e * e * (3 - 2 * e);
  }
  return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, angle };
}

// ── raycaster ──────────────────────────────────────────────────────────

const OFFICE_HAZE = rgb(186, 170, 100);
const POOL_HAZE = rgb(210, 232, 236);

/**
 * One ray per column through the grid, walls textured and lit evenly (the
 * point of the place is the flat fluorescent light), fading into a haze
 * with distance. Floor and ceiling are cast per pixel.
 */
export function renderView(f: Frame, level: Level, px: number, py: number, angle: number, bob: number, t: number, flicker: boolean) {
  const map = MAPS[level];
  const at = (x: number, y: number) => (y >= 0 && y < SIZE && x >= 0 && x < SIZE ? map[y][x] : '#');
  const haze = level === 'office' ? OFFICE_HAZE : POOL_HAZE;
  const fog = level === 'office' ? 14 : 18;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const planeX = -dy * 0.72;
  const planeY = dx * 0.72;
  const horizon = H / 2 + bob;
  const wallScale = H * 1.05;

  for (let y = 0; y < H; y++) {
    const p = y - horizon;
    if (Math.abs(p) < 0.5) continue;
    const rowDist = (wallScale / 2) / Math.abs(p);
    const fade = Math.min(1, rowDist / fog);
    const stepX = (rowDist * 2 * planeX) / W;
    const stepY = (rowDist * 2 * planeY) / W;
    let wx = px + rowDist * (dx - planeX);
    let wy = py + rowDist * (dy - planeY);
    for (let x = 0; x < W; x++) {
      let c: Color;
      const fx = wx - Math.floor(wx);
      const fy = wy - Math.floor(wy);
      if (p > 0) {
        if (level === 'office') {
          // damp carpet: fibres of noise and a few darker patches
          const h = ((Math.floor(wx * 9) * 73856093) ^ (Math.floor(wy * 9) * 19349663)) >>> 0;
          c = shade(rgb(150, 130, 70), 0.86 + (h % 100) / 600 - (Math.sin(wx * 0.9) * Math.cos(wy * 1.3) > 0.7 ? 0.12 : 0));
        } else {
          const grid = fx < 0.04 || fy < 0.04;
          const shimmer = Math.sin(wx * 3.1 + t / 700) * Math.sin(wy * 2.7 - t / 900);
          c = grid ? rgb(150, 210, 226) : shade(rgb(70, 178, 214), 0.92 + shimmer * 0.12);
        }
      } else {
        // tile seams only up close: far away they alias into streaks
        const tileEdge = rowDist < 6 && (fx < 0.05 || fy < 0.05);
        const lit = Math.floor(wx) % 3 === 1 && Math.floor(wy) % 3 === 1 && fx > 0.15 && fx < 0.85 && fy > 0.3 && fy < 0.7;
        if (lit) c = flicker && Math.floor(wx) === Math.floor(px + dx * 3) ? rgb(150, 146, 120) : rgb(255, 252, 226);
        else c = tileEdge ? rgb(150, 144, 116) : level === 'office' ? rgb(214, 206, 170) : rgb(236, 240, 238);
      }
      f.buf[y * W + x] = mix(c, haze, fade * 0.75);
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
    for (let n = 0; n < 64; n++) {
      if (sdx < sdy) {
        sdx += ddx;
        mx += sx;
        side = 0;
      } else {
        sdy += ddy;
        my += sy;
        side = 1;
      }
      if (at(mx, my) === '#') break;
    }
    const dist = side === 0 ? sdx - ddx : sdy - ddy;
    const lineH = wallScale / Math.max(0.05, dist);
    const top = horizon - lineH / 2;
    let wallX = side === 0 ? py + dist * ry : px + dist * rx;
    wallX -= Math.floor(wallX);
    const tex = level === 'office' ? WALLPAPER : POOL_TILE;
    const tx = Math.min(TS - 1, (wallX * TS) | 0);
    const fade = Math.min(1, dist / fog) * 0.75;
    const sideShade = side ? 0.9 : 1;
    const y0 = Math.max(0, Math.ceil(top));
    const y1 = Math.min(H, Math.floor(top + lineH));
    for (let y = y0; y < y1; y++) {
      const ty = Math.min(TS - 1, (((y - top) / lineH) * TS) | 0);
      f.buf[y * W + x] = mix(shade(tex[ty * TS + tx], sideShade), haze, fade);
    }
  }
}

// ── VHS artefacts ──────────────────────────────────────────────────────

/**
 * Colour fringe (red channel one pixel right), sparse tape noise, a ragged
 * head-switching band at the bottom, and `glitch` (0–1) of tracking error:
 * rows torn sideways and snow.
 */
export function vhs(f: Frame, glitch: number) {
  const b = f.buf;
  for (let y = 0; y < H; y++) {
    const row = y * W;
    for (let x = W - 1; x > 0; x--) {
      const c = b[row + x];
      b[row + x] = rgb(R(b[row + x - 1]), G(c), B(c));
    }
  }
  const specks = 90 + glitch * 1800;
  for (let i = 0; i < specks; i++) {
    const k = (Math.random() * W * H) | 0;
    const v = 120 + Math.random() * 135;
    b[k] = mix(b[k], rgb(v, v, v), 0.6);
  }
  const torn = (y: number, amount: number) => {
    const row = y * W;
    const line = b.slice(row, row + W);
    for (let x = 0; x < W; x++) b[row + x] = line[(x - amount + W * 4) % W];
  };
  for (let y = H - 4; y < H; y++) torn(y, (Math.random() * 10) | 0);
  if (glitch > 0) {
    const bands = 1 + Math.floor(glitch * 5);
    for (let k = 0; k < bands; k++) {
      const y0 = (Math.random() * H) | 0;
      const h = 2 + ((Math.random() * 10 * glitch) | 0);
      const amount = ((Math.random() - 0.5) * 40 * glitch) | 0;
      for (let y = y0; y < Math.min(H, y0 + h); y++) torn(y, amount);
    }
  }
}

/** Battery icon: four cells, one per focus session in the set. */
export function battery(f: Frame, x: number, y: number, cells: ('done' | 'live' | 'todo')[], blinkOn: boolean) {
  f.rect(x, y, 26, 9, BLACK);
  f.rect(x + 1, y + 1, 24, 7, WHITE);
  f.rect(x + 2, y + 2, 22, 5, BLACK);
  f.rect(x + 26, y + 3, 2, 3, WHITE);
  cells.forEach((c, i) => {
    if (c === 'done' || (c === 'live' && blinkOn)) f.rect(x + 3 + i * 5, y + 3, 4, 3, WHITE);
  });
}
