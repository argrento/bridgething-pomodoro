import { useEffect, useRef, type ReactNode } from 'react';
import { Field, H, W } from './field';

/** Speeds in depth units per second; a star crosses the screen in about 1/speed seconds. */
export const CRUISE = 0.1;
const WARP = 0.8;
const FRAME_MS = 33; // ~30 fps is plenty for slow drift and spares the Car Thing

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * ease(t);
/** Ease between speeds on a log scale: speed is felt as a ratio, so the slow-down reads as even. */
const glide = (a: number, b: number, t: number) => {
  const lo = Math.max(b, 0.002);
  const v = a * Math.pow(lo / a, ease(t));
  return t >= 1 ? b : v;
};

/** Speed during a jump into lightspeed (`in`) or a drop out of it (`out`), or null once it's over. */
function scripted(kind: 'in' | 'out', t: number, from: number, to: number): number | null {
  if (kind === 'in') {
    if (t < 0.9) return lerp(from, WARP, t / 0.9);
    if (t < 1.2) return WARP;
    if (t < 3.7) return glide(WARP, to, (t - 1.2) / 2.5);
    return null;
  }
  if (t < 0.2) return WARP;
  if (t < 2.4) return glide(WARP, to, (t - 0.2) / 2.2);
  return null;
}

/**
 * The canvas. `speed` is where the flight settles; bumping `jump` plays the
 * jump to lightspeed, bumping `drop` the arrival. Frames run only while the
 * stars move; a still sky is a single frame.
 */
export default function Sky({
  speed,
  jump = 0,
  drop = 0,
  children,
}: {
  speed: number;
  jump?: number;
  drop?: number;
  children?: ReactNode;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const field = useRef<Field | null>(null);
  const current = useRef(0);
  const target = useRef(speed);
  const script = useRef<{ kind: 'in' | 'out'; t0: number; from: number } | null>(null);
  const seen = useRef({ jump, drop });
  const raf = useRef(0);
  target.current = speed;

  if (jump !== seen.current.jump) script.current = { kind: 'in', t0: performance.now(), from: current.current };
  if (drop !== seen.current.drop) script.current = { kind: 'out', t0: performance.now(), from: WARP };
  seen.current = { jump, drop };

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    field.current ??= new Field();
    const f = field.current;
    let last = performance.now();

    const frame = (now: number) => {
      raf.current = 0;
      const dt = Math.min(0.1, (now - last) / 1000);
      if (now - last >= FRAME_MS) {
        last = now;
        const sc = script.current;
        const s = sc && scripted(sc.kind, (now - sc.t0) / 1000, sc.from, target.current);
        if (sc && s === null) script.current = null;
        current.current =
          s ?? current.current + (target.current - current.current) * Math.min(1, dt * 1.5);
        if (Math.abs(current.current) < 0.0005 && target.current === 0) current.current = 0;
        f.step(dt, current.current);
        f.draw(ctx, current.current);
      }
      if (current.current !== 0 || target.current !== 0 || script.current) raf.current = requestAnimationFrame(frame);
    };

    f.draw(ctx, current.current);
    if (!raf.current) raf.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, [speed, jump, drop]);

  return (
    <div className="sky">
      <canvas ref={canvas} width={W} height={H} />
      {children}
    </div>
  );
}
