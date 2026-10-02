import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Frame, H, W } from './engine';

/** ~8 fps: enough for tape jitter and a slow walk, cheap on the Car Thing. */
const FRAME_MS = 125;

/** Hosts the 240×144 canvas; frames come from the app's 4 Hz tick, or 8 fps while animating. */
export default function Screen({
  draw,
  animating,
  children,
}: {
  draw: (f: Frame, t: number) => void;
  animating: boolean;
  children?: ReactNode;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef<Frame | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!animating) return;
    const id = setInterval(() => setTick(n => n + 1), FRAME_MS);
    return () => clearInterval(id);
  }, [animating]);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    frame.current ??= new Frame(ctx);
    draw(frame.current, performance.now());
    ctx.putImageData(frame.current.img, 0, 0);
  });

  return (
    <div className="tape">
      <canvas ref={canvas} width={W} height={H} className="video" />
      <div className="scanlines" />
      {children}
    </div>
  );
}
