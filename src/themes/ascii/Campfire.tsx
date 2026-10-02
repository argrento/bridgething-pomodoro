import { useEffect, useRef } from 'react';

/** Character cell grid for the whole screen: 8×14 px cells on 800×480. */
export const COLS = 100;
export const ROWS = 34;
/** Fire simulation size, centred; its bottom row sits on the logs. */
const FW = 56;
const FH = 18;
const FIRE_LEFT_COL = (COLS - FW) / 2;
const FIRE_BOTTOM_ROW = 28;
/** Sparks and smoke live in a box around the fire, not the whole screen. */
const PW = FW;
const PH = 24;
const PARTICLE_TOP_ROW = FIRE_BOTTOM_ROW - PH;
const MAX = 36;
/** Average heat lost per row; with MAX this sets how tall a full fire burns. */
const DECAY = 4;
const RAMP = ' .:-=+*#%@';
const FRAME_MS = 100;
/** Stars change slowly; redraw them every this many frames. */
const SKY_EVERY = 6;
const BURST_MS = 1400;

interface Particle {
  x: number;
  y: number;
  vx: number;
  life: number;
  ch: string;
}

const blank = (w: number, h: number) => Array.from({ length: h }, () => Array<string>(w).fill(' '));
const join = (g: string[][]) => g.map(r => r.join('')).join('\n');

/**
 * The scene's moving parts: stars, a Doom-style fire drawn in density
 * characters, sparks above it and smoke when it is out. Everything is
 * written straight into <pre> elements on a timer, so React does not
 * re-render per frame.
 *
 * `level` is the fire's strength: 0 unlit, ~0.15 embers, 1 full.
 * `burst` changing triggers a flare-up with a shower of sparks.
 */
const LOGS =
  '                                        __/\\____/\\____/\\__\n                                       (____________________)';

const box = (row: number) => ({ top: `${row * 14}px`, left: `${FIRE_LEFT_COL * 8}px`, width: `${FW * 8}px` });

export default function Campfire({ level, smoke, burst }: { level: number; smoke: boolean; burst: number }) {
  const skyRef = useRef<HTMLPreElement>(null);
  const fireRef = useRef<HTMLPreElement>(null);
  const sparkRef = useRef<HTMLPreElement>(null);
  const smokeRef = useRef<HTMLPreElement>(null);
  const props = useRef({ level, smoke });
  props.current = { level, smoke };
  const burstAt = useRef(0);
  const lastBurst = useRef(burst);
  if (burst !== lastBurst.current) {
    lastBurst.current = burst;
    burstAt.current = performance.now();
  }

  useEffect(() => {
    const heat = new Float32Array(FW * FH);
    const stars = Array.from({ length: 60 }, () => ({
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * 9),
      ch: '.',
    }));
    const sparks: Particle[] = [];
    const puffs: Particle[] = [];
    let frame = 0;
    /** Only touch the DOM when the text actually changed. */
    const set = (el: HTMLPreElement | null, text: string) => {
      if (el && el.textContent !== text) el.textContent = text;
    };

    const tick = () => {
      const now = performance.now();
      const bursting = now - burstAt.current < BURST_MS;
      const lv = bursting ? 1.25 : props.current.level;

      // heat source along the bottom row, widest at the centre
      const half = 5 + lv * 11;
      for (let x = 0; x < FW; x++) {
        const d = Math.abs(x - FW / 2);
        heat[(FH - 1) * FW + x] = d < half ? MAX * lv * (0.7 + 0.3 * Math.random()) * (1 - 0.5 * (d / half) ** 2) : 0;
      }
      // each cell pulls heat from just below, with a little sideways wander;
      // pulling (not pushing) rewrites every cell, so no stale heat lingers
      for (let y = 0; y < FH - 1; y++) {
        for (let x = 0; x < FW; x++) {
          const sx = Math.min(FW - 1, Math.max(0, x + ((Math.random() * 3) | 0) - 1));
          heat[y * FW + x] = Math.max(0, heat[(y + 1) * FW + sx] - Math.random() * DECAY);
        }
      }
      let fire = '';
      for (let y = 0; y < FH; y++) {
        for (let x = 0; x < FW; x++) fire += RAMP[Math.min(9, Math.floor((heat[y * FW + x] / MAX) * 10))];
        if (y < FH - 1) fire += '\n';
      }
      set(fireRef.current, fire);

      // sparks leap from a lively fire
      const sparkRate = bursting ? 3 : lv > 0.25 ? lv * 0.6 : 0;
      for (let n = sparkRate; n > 0; n--) {
        if (Math.random() > n) break;
        sparks.push({
          x: PW / 2 + (Math.random() - 0.5) * half * 1.2,
          y: PH - 4 - lv * 8,
          vx: (Math.random() - 0.5) * 0.6,
          life: 8 + Math.random() * 14,
          ch: ['*', '.', "'", '`'][(Math.random() * 4) | 0],
        });
      }
      // smoke curls from a cold or smouldering fire
      if (props.current.smoke && Math.random() < 0.35) {
        puffs.push({
          x: PW / 2 + (Math.random() - 0.5) * 6,
          y: PH - 1,
          vx: 0,
          life: 30 + Math.random() * 20,
          ch: ['~', '(', ')', 'o', '°'][(Math.random() * 5) | 0],
        });
      }
      const draw = (list: Particle[], rise: number, wander: number) => {
        const g = blank(PW, PH);
        for (let i = list.length - 1; i >= 0; i--) {
          const p = list[i];
          p.y -= rise;
          p.x += p.vx + (Math.random() - 0.5) * wander;
          p.life--;
          const cx = Math.round(p.x);
          const cy = Math.round(p.y);
          if (p.life <= 0 || cy < 0 || cy >= PH || cx < 0 || cx >= PW) {
            list.splice(i, 1);
            continue;
          }
          g[cy][cx] = p.ch;
        }
        return join(g);
      };
      set(sparkRef.current, draw(sparks, 0.9, 0.5));
      set(smokeRef.current, draw(puffs, 0.35, 0.9));

      // a few stars twinkle now and then
      if (frame++ % SKY_EVERY === 0) {
        for (let k = 0; k < 4; k++) {
          const s = stars[(Math.random() * stars.length) | 0];
          s.ch = ['.', '.', '+', '*', '·', ' '][(Math.random() * 6) | 0];
        }
        const sky = blank(COLS, 9);
        for (const s of stars) sky[s.y][s.x] = s.ch;
        set(skyRef.current, join(sky));
      }
    };

    tick();
    const id = setInterval(tick, FRAME_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <pre ref={skyRef} className="layer sky" />
      <pre ref={smokeRef} className="layer smoke" style={box(PARTICLE_TOP_ROW)} />
      <pre ref={fireRef} className="layer fire" style={box(FIRE_BOTTOM_ROW - FH)} />
      <pre ref={sparkRef} className="layer sparks" style={box(PARTICLE_TOP_ROW)} />
      <pre className="layer logs" style={{ top: `${FIRE_BOTTOM_ROW * 14}px` }}>
        {LOGS}
      </pre>
      {/* glowing copy whose opacity pulses: compositor-only, no repaint */}
      <pre className="layer logs-glow" style={{ top: `${FIRE_BOTTOM_ROW * 14}px` }}>
        {LOGS}
      </pre>
      <pre className="layer ground" style={{ top: `${(FIRE_BOTTOM_ROW + 2) * 14}px` }}>
        {`.,"'.,;'".,`.repeat(10).slice(0, COLS)}
      </pre>
    </>
  );
}
