const SIZE = 440;
const C = SIZE / 2;
const ARC_R = 150;
const ARC_LEN = 2 * Math.PI * ARC_R;
const HOLD_R = 128;
const HOLD_LEN = 2 * Math.PI * HOLD_R;

const TICKS = Array.from({ length: 60 }, (_, i) => {
  const major = i % 5 === 0;
  const a = (i / 60) * 2 * Math.PI;
  const sin = Math.sin(a);
  const cos = -Math.cos(a);
  const r1 = 208;
  const r2 = major ? 188 : 198;
  return { i, major, x1: C + sin * r1, y1: C + cos * r1, x2: C + sin * r2, y2: C + cos * r2 };
});

const LABELS = Array.from({ length: 12 }, (_, k) => {
  const a = (k / 12) * 2 * Math.PI;
  return { text: String(k * 5), x: C + Math.sin(a) * 172, y: C - Math.cos(a) * 172 };
});

/**
 * A Time Timer–style face: the full circle is sixty minutes and the lit arc
 * is the time remaining, so a set duration and a countdown read the same way.
 */
export default function Dial({ minutes, holding }: { minutes: number; holding: boolean }) {
  const frac = Math.min(Math.max(minutes, 0), 60) / 60;
  const lit = Math.ceil(frac * 60 - 1e-6);
  const over = minutes > 60;

  return (
    <svg className="dial" viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
      <defs>
        <linearGradient id="arc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent-2)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
        <radialGradient id="face" cx="0.5" cy="0.42" r="0.6">
          <stop offset="0" stopColor="rgba(255,255,255,0.07)" />
          <stop offset="1" stopColor="rgba(255,255,255,0.01)" />
        </radialGradient>
      </defs>

      <circle cx={C} cy={C} r={214} className="rim" />
      <circle cx={C} cy={C} r={ARC_R + 22} fill="url(#face)" />

      {TICKS.map(t => (
        <line
          key={t.i}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
          className={`tick${t.major ? ' major' : ''}${t.i < lit || over ? ' lit' : ''}`}
        />
      ))}
      {LABELS.map(l => (
        <text key={l.text} x={l.x} y={l.y} className="label" textAnchor="middle" dominantBaseline="central">
          {l.text}
        </text>
      ))}

      <circle cx={C} cy={C} r={ARC_R} className="track" />
      <circle
        cx={C}
        cy={C}
        r={ARC_R}
        className="arc"
        stroke="url(#arc)"
        strokeDasharray={ARC_LEN}
        strokeDashoffset={ARC_LEN * (1 - frac)}
        transform={`rotate(-90 ${C} ${C})`}
        style={{ opacity: frac > 0.002 ? 1 : 0 }}
      />
      <g className="knob" style={{ transform: `rotate(${frac * 360}deg)` }}>
        <circle cx={C} cy={C - ARC_R} r={20} className="knob-halo" />
        <circle cx={C} cy={C - ARC_R} r={9} className="knob-dot" />
      </g>

      <circle
        cx={C}
        cy={C}
        r={HOLD_R}
        className={`hold${holding ? ' on' : ''}`}
        strokeDasharray={HOLD_LEN}
        style={{ ['--hold-len' as string]: HOLD_LEN }}
        transform={`rotate(-90 ${C} ${C})`}
      />
    </svg>
  );
}
