import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FONT, Gfx, H, W } from './engine';

/** Repaint at least this often while an effect (hold, flash) is animating. */
const FRAME_MS = 80;

/**
 * Hosts the 200×120 canvas. `draw` runs on every render and whenever
 * `animating` asks for frames; the result is snapped to the palette.
 */
export default function Screen({
  draw,
  animating,
  invert,
  children,
}: {
  draw: (g: Gfx, t: number) => void;
  animating: boolean;
  invert: (t: number) => boolean;
  children?: ReactNode;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const gfx = useRef<Gfx | null>(null);
  const [, setFontReady] = useState(false);
  const [, setFrame] = useState(0);

  useEffect(() => {
    document.fonts
      .load(`8px ${FONT}`)
      .then(() => setFontReady(true))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!animating) return;
    const id = setInterval(() => setFrame(f => f + 1), FRAME_MS);
    return () => clearInterval(id);
  }, [animating]);

  useEffect(() => {
    if (!canvas.current) return;
    gfx.current ??= new Gfx(canvas.current);
    const t = performance.now();
    draw(gfx.current, t);
    gfx.current.quantize(invert(t));
  });

  return (
    <div className="gb">
      <canvas ref={canvas} width={W} height={H} className="lcd" />
      {children}
    </div>
  );
}
