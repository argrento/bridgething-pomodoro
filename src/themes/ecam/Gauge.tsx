/** Angle (degrees, counter-clockwise from +x) for a value on a 220° dial starting lower left. */
const SWEEP = 220;
const START = 200;
const at = (cx: number, cy: number, r: number, deg: number) => [cx + r * Math.cos((deg * Math.PI) / 180), cy - r * Math.sin((deg * Math.PI) / 180)] as const;

/**
 * An ECAM-style round gauge: white scale, amber and red bands, a cyan
 * limit marker, a green needle that spools to its value, and the reading
 * in a box. The needle turns with a CSS transition, like a lagging engine.
 */
export default function Gauge({
  cx,
  cy,
  r,
  value,
  max,
  ticks,
  tickLabel,
  amberFrom,
  redFrom,
  limit,
  digits,
  live,
}: {
  cx: number;
  cy: number;
  r: number;
  value: number;
  max: number;
  ticks: number[];
  tickLabel: (t: number) => string;
  amberFrom?: number;
  redFrom: number;
  limit?: number;
  digits: string;
  live: boolean;
}) {
  const deg = (v: number) => START - (Math.max(0, Math.min(max, v)) / max) * SWEEP;
  const arc = (from: number, to: number, rr: number) => {
    const [x0, y0] = at(cx, cy, rr, deg(from));
    const [x1, y1] = at(cx, cy, rr, deg(to));
    const large = ((to - from) / max) * SWEEP > 180 ? 1 : 0;
    return `M${x0} ${y0}A${rr} ${rr} 0 ${large} 1 ${x1} ${y1}`;
  };
  const [nx, ny] = at(cx, cy, r - 4, START);
  const turn = (Math.max(0, Math.min(max, value)) / max) * SWEEP;
  return (
    <g className={live ? 'gauge' : 'gauge off'}>
      <path d={arc(0, redFrom, r)} className="scale" />
      {amberFrom !== undefined && <path d={arc(amberFrom, redFrom, r - 2)} className="band amber" />}
      <path d={arc(redFrom, max, r - 2)} className="band red" />
      {ticks.map(t => {
        const [x0, y0] = at(cx, cy, r, deg(t));
        const [x1, y1] = at(cx, cy, r - 7, deg(t));
        const [lx, ly] = at(cx, cy, r - 17, deg(t));
        return (
          <g key={t}>
            <line x1={x0} y1={y0} x2={x1} y2={y1} className="tick" />
            <text x={lx} y={ly + 4} className="tick-label" textAnchor="middle">
              {tickLabel(t)}
            </text>
          </g>
        );
      })}
      {limit !== undefined && (() => {
        const [lx, ly] = at(cx, cy, r + 5, deg(limit));
        return <circle cx={lx} cy={ly} r="3.5" className="limit" />;
      })()}
      <g className="needle" style={{ transform: `rotate(${turn}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
        <line x1={cx} y1={cy} x2={nx} y2={ny} />
      </g>
      <circle cx={cx} cy={cy} r="3" className="hub" />
      <rect x={cx + 4} y={cy + 14} width={r * 0.9} height="24" rx="2" className="readout-box" />
      <text x={cx + 4 + r * 0.9 - 6} y={cy + 33} className="readout" textAnchor="end">
        {digits}
      </text>
    </g>
  );
}
