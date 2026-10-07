/**
 * A perspective starfield. Stars live in a box in front of the viewer
 * (x, y in -1..1, depth z in 0..1) and are projected toward the centre;
 * flying forward shrinks z. At speed each star is drawn as a streak from
 * where it was a moment ago, which is the jump-to-lightspeed look.
 */

export const W = 800;
export const H = 480;
const CX = W / 2;
const CY = H / 2;
const F = W / 2; // focal length: at z = 1 the box just covers the screen
const NEAR = 0.03;
const TRAIL_S = 0.06; // how far back in time a streak reaches
const COUNT = 220;
const TINTS = ['#ffffff', '#ffffff', '#ffffff', '#d6e4ff', '#ffeed6'];

interface Star {
  x: number;
  y: number;
  z: number;
  tint: string;
}

const spawn = (s: Star, z: number) => {
  s.x = Math.random() * 2 - 1;
  s.y = Math.random() * 2 - 1;
  s.z = z;
  s.tint = TINTS[Math.floor(Math.random() * TINTS.length)];
};

export class Field {
  stars: Star[] = Array.from({ length: COUNT }, () => {
    const s = { x: 0, y: 0, z: 0, tint: '' };
    spawn(s, NEAR + Math.random() * (1 - NEAR));
    return s;
  });

  /** Fly forward `speed` depth units per second for `dt` seconds. */
  step(dt: number, speed: number) {
    for (const s of this.stars) {
      s.z -= speed * dt;
      const k = F / s.z;
      if (s.z < NEAR || Math.abs(s.x * k) > CX + 40 || Math.abs(s.y * k) > CY + 40) spawn(s, 0.85 + Math.random() * 0.15);
    }
  }

  draw(ctx: CanvasRenderingContext2D, speed: number) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#04050a';
    ctx.fillRect(0, 0, W, H);
    const trail = speed * TRAIL_S;
    for (const s of this.stars) {
      // far stars fade in from nothing, near ones are full brightness
      const a = Math.min(1, (1 - s.z) * 1.4);
      if (a < 0.03) continue;
      const k = F / s.z;
      const sx = CX + s.x * k;
      const sy = CY + s.y * k;
      ctx.globalAlpha = a;
      // each star streaks by how far it really moved on screen, so streaks
      // shrink smoothly into points as the ship slows rather than all at once
      const k2 = F / (s.z + trail);
      const px = CX + s.x * k2;
      const py = CY + s.y * k2;
      if (Math.abs(sx - px) + Math.abs(sy - py) > 1.5) {
        ctx.strokeStyle = s.tint;
        ctx.lineWidth = s.z < 0.3 ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      } else {
        const r = s.z < 0.25 ? 2 : s.z < 0.6 ? 1.5 : 1;
        ctx.fillStyle = s.tint;
        ctx.fillRect(sx - r / 2, sy - r / 2, r, r);
      }
    }
    ctx.globalAlpha = 1;
  }
}
