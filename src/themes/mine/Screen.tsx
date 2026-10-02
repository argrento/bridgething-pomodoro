import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Frame, H, W } from './engine';

/** Frames from the app's 4 Hz tick, or ~6 fps while something moves. */
export default function Screen({ draw, fps, children }: { draw: (f: Frame, t: number) => void; fps: number; children?: ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef<Frame | null>(null);
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!fps) return;
    const id = setInterval(() => setTick(n => n + 1), 1000 / fps);
    return () => clearInterval(id);
  }, [fps]);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    frame.current ??= new Frame(ctx);
    draw(frame.current, performance.now());
    ctx.putImageData(frame.current.img, 0, 0);
  });
  return (
    <div className="mine">
      <canvas ref={canvas} width={W} height={H} className="blocks" />
      {children}
    </div>
  );
}
