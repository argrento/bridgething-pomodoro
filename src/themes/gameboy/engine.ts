/**
 * A tiny DMG-style renderer: everything is drawn onto a 200×120 canvas in
 * four shades, then CSS scales it ×4 with nearest-neighbour sampling.
 */
export const W = 200;
export const H = 120;

/** Shade 0 is the lightest (screen background), 3 the darkest (ink). */
export const PALETTE: [number, number, number][] = [
  [155, 188, 15],
  [139, 172, 15],
  [48, 98, 48],
  [15, 56, 15],
];
const css = (s: number) => `rgb(${PALETTE[s].join(',')})`;
export const FONT = '"Press Start 2P"';

/** A sprite row is a string of '.', '0'-'3'; '.' is transparent. */
export type Sprite = string[];

export class Gfx {
  readonly ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.textBaseline = 'top';
  }

  clear(shade = 0) {
    this.rect(0, 0, W, H, shade);
  }

  rect(x: number, y: number, w: number, h: number, shade: number) {
    this.ctx.fillStyle = css(shade);
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  /** One-pixel outline. */
  outline(x: number, y: number, w: number, h: number, shade: number) {
    this.rect(x, y, w, 1, shade);
    this.rect(x, y + h - 1, w, 1, shade);
    this.rect(x, y, 1, h, shade);
    this.rect(x + w - 1, y, 1, h, shade);
  }

  /** Dialogue box: light fill, double dark rule with clipped corners. */
  box(x: number, y: number, w: number, h: number) {
    this.rect(x, y, w, h, 0);
    this.rect(x + 1, y, w - 2, 2, 3);
    this.rect(x + 1, y + h - 2, w - 2, 2, 3);
    this.rect(x, y + 1, 2, h - 2, 3);
    this.rect(x + w - 2, y + 1, 2, h - 2, 3);
    this.outline(x + 3, y + 3, w - 6, h - 6, 2);
  }

  /** Status-panel bracket, as under a battle name: a rule along the bottom and right. */
  bracket(x: number, y: number, w: number, h: number) {
    this.rect(x, y + h - 2, w, 2, 3);
    this.rect(x + w - 2, y, 2, h, 3);
    this.rect(x + w - 6, y + h - 4, 4, 2, 3);
  }

  text(s: string, x: number, y: number, shade = 3, size = 8) {
    this.ctx.font = `${size}px ${FONT}`;
    this.ctx.fillStyle = css(shade);
    this.ctx.fillText(s, Math.round(x), Math.round(y));
  }

  /** Horizontal meter with a dark frame; `frac` of it filled. */
  meter(x: number, y: number, w: number, h: number, frac: number, fill = 3) {
    this.outline(x, y, w, h, 3);
    this.rect(x + 1, y + 1, w - 2, h - 2, 0);
    const inner = Math.round((w - 2) * Math.min(1, Math.max(0, frac)));
    if (inner > 0) this.rect(x + 1, y + 1, inner, h - 2, fill);
  }

  sprite(rows: Sprite, x: number, y: number, scale = 1) {
    rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch !== '.') this.rect(x + c * scale, y + r * scale, scale, scale, Number(ch));
      }
    });
  }

  /**
   * Snap every pixel to the nearest palette shade. Canvas text is
   * antialiased; this turns the in-between greys back into DMG pixels.
   * `invert` swaps light and dark, for the battle-start flash.
   */
  quantize(invert = false) {
    const img = this.ctx.getImageData(0, 0, W, H);
    const d = img.data;
    const lum = PALETTE.map(([r, g, b]) => r * 0.3 + g * 0.59 + b * 0.11);
    for (let i = 0; i < d.length; i += 4) {
      const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
      let best = 0;
      for (let s = 1; s < 4; s++) if (Math.abs(lum[s] - l) < Math.abs(lum[best] - l)) best = s;
      const [r, g, b] = PALETTE[invert ? 3 - best : best];
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
    this.ctx.putImageData(img, 0, 0);
  }
}

/** Width in pixels of `s` in the 8×8 font at `size`. */
export const textWidth = (s: string, size = 8) => s.length * size;
