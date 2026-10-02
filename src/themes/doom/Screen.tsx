import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Frame, H, melt, meltOffsets, W } from './engine';

const FRAME_MS = 100;
const MELT_MS = 1200;

/**
 * Hosts the 200×120 canvas. `draw` paints a full frame; when `wipe`
 * changes, the previous frame melts down off the screen over the new one.
 * Frames are produced only while `animating` (or a wipe runs); otherwise
 * the screen redraws with the app's own 4 Hz tick.
 */
export default function Screen({
  draw,
  animating,
  wipe,
  children,
}: {
  draw: (f: Frame, t: number) => void;
  animating: boolean;
  wipe: number;
  children?: ReactNode;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef<Frame | null>(null);
  const last = useRef<Uint32Array | null>(null);
  const wipeSeen = useRef(wipe);
  const melting = useRef<{ old: Uint32Array; offsets: Int16Array; t0: number } | null>(null);
  const [, setTick] = useState(0);

  if (wipe !== wipeSeen.current) {
    wipeSeen.current = wipe;
    if (last.current) melting.current = { old: last.current.slice(), offsets: meltOffsets(), t0: performance.now() };
  }

  const busy = animating || melting.current !== null;
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setTick(n => n + 1), melting.current ? 40 : FRAME_MS);
    return () => clearInterval(id);
  }, [busy]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    frame.current ??= new Frame(ctx);
    const f = frame.current;
    const t = performance.now();
    draw(f, t);
    last.current = f.buf.slice();
    const m = melting.current;
    if (m && !melt(f, m.old, m.offsets, t - m.t0)) melting.current = null;
    if (m && t - m.t0 > MELT_MS) melting.current = null;
    ctx.putImageData(f.img, 0, 0);
  });

  return (
    <div className="doom">
      <canvas ref={canvas} width={W} height={H} className="vga" />
      {children}
    </div>
  );
}
