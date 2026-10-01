import type { Mode, Phase } from '../types';

const W = 460;
const H = 384;
const CX = W / 2;
const CY = H / 2;
const R = 160;
const HOLD_R = 112;
const HOLD_LEN = 2 * Math.PI * HOLD_R;

const polar = (r: number, frac: number) => {
  const a = frac * 2 * Math.PI;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)] as const;
};

const TICKS = Array.from({ length: 60 }, (_, i) => {
  const major = i % 5 === 0;
  const [x1, y1] = polar(R, i / 60);
  const [x2, y2] = polar(R - (major ? 9 : 4.5), i / 60);
  return { i, major, x1, y1, x2, y2 };
});

const LABELS = Array.from({ length: 12 }, (_, k) => {
  const [x, y] = polar(R + 15, k / 12);
  return { text: String(k * 5), x, y };
});

const FILL: Record<Phase, string> = {
  focus: 'url(#hatch)',
  short: 'url(#dots)',
  long: 'url(#cross)',
};

/** Sector from 12 o'clock clockwise, as TikZ would draw `(0,0) -- (90:R) arc[...] -- cycle`. */
function sector(frac: number): string {
  if (frac <= 0) return '';
  if (frac >= 0.9999) {
    return `M ${CX} ${CY - R} A ${R} ${R} 0 1 1 ${CX - 0.01} ${CY - R} Z`;
  }
  const [x, y] = polar(R, frac);
  return `M ${CX} ${CY} L ${CX} ${CY - R} A ${R} ${R} 0 ${frac > 0.5 ? 1 : 0} 1 ${x} ${y} Z`;
}

/**
 * Figure 1. A 60-minute clock face drawn in the manner of a TikZ figure: the
 * patterned sector is the time remaining, so setting and counting down read
 * the same way.
 */
export default function Dial({
  minutes,
  phase,
  mode,
  primary,
  secondary,
  holding,
  bump,
}: {
  minutes: number;
  phase: Phase;
  mode: Mode;
  primary: string;
  secondary: string;
  holding: boolean;
  bump: number;
}) {
  const frac = Math.min(Math.max(minutes, 0), 60) / 60;
  const [hx, hy] = polar(R - 22, frac);
  const boxW = mode === 'idle' ? 128 : 172;

  return (
    <svg className={`figure mode-${mode}`} viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <defs>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" className="pat" />
        </pattern>
        <pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="3.5" cy="3.5" r="1.05" className="pat-dot" />
        </pattern>
        <pattern id="cross" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" className="pat" />
          <line x1="0" y1="0" x2="7" y2="0" className="pat" />
        </pattern>
        <marker id="stealth" viewBox="-8 -4 9 8" markerWidth="9" markerHeight="8" refX="0" refY="0" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M 0 0 L -8 -3.6 L -5.6 0 L -8 3.6 Z" className="ink-fill" />
        </marker>
      </defs>

      {/* help lines, as \draw[help lines] */}
      <line x1={CX - R - 4} y1={CY} x2={CX + R + 4} y2={CY} className="help" />
      <line x1={CX} y1={CY - R - 4} x2={CX} y2={CY + R + 4} className="help" />

      <path d={sector(frac)} fill={FILL[phase]} className="sector" />
      <circle cx={CX} cy={CY} r={R} className="axis" />
      {TICKS.map(t => (
        <line key={t.i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} className={t.major ? 'tick major' : 'tick'} />
      ))}
      {LABELS.map(l => (
        <text key={l.text} x={l.x} y={l.y} className="tick-label" textAnchor="middle" dominantBaseline="central">
          {l.text}
        </text>
      ))}

      {frac > 0 && <line x1={CX} y1={CY} x2={hx} y2={hy} className="hand" markerEnd="url(#stealth)" />}
      <circle cx={CX} cy={CY} r={2.6} className="ink-fill" />

      <circle
        cx={CX}
        cy={CY}
        r={HOLD_R}
        className={`hold${holding ? ' on' : ''}`}
        strokeDasharray={HOLD_LEN}
        style={{ ['--hold-len' as string]: HOLD_LEN }}
        transform={`rotate(-90 ${CX} ${CY})`}
      />

      {/* \node[draw, fill=white, inner sep=6pt] at (0,0) {...}; */}
      <rect x={CX - boxW / 2} y={CY - 46} width={boxW} height={92} className="node" />
      <text key={bump} x={CX} y={CY + 4} className={`node-main${mode === 'idle' ? ' idle bump' : ''}`} textAnchor="middle">
        {primary}
      </text>
      <text x={CX} y={CY + 32} className="node-sub" textAnchor="middle">
        {secondary}
      </text>

      <text x={W - 4} y={H - 6} className="annot" textAnchor="end">
        <tspan className="it">θ</tspan> = 2<tspan className="it">π</tspan>Δ<tspan className="it">t</tspan> / 60
      </text>
      <text x={4} y={H - 6} className="annot">
        <tspan className="it">t</tspan> [min]
      </text>
    </svg>
  );
}
