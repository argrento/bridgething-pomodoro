import type { ReactNode } from 'react';

/*
 * Electroluminescent seven-segment digits, drawn as SVG so unlit segments
 * stay faintly visible the way they do on the real panel.
 */

const T = 3; // half the segment thickness

const h = (x1: number, x2: number, y: number) =>
  `${x1},${y} ${x1 + T},${y - T} ${x2 - T},${y - T} ${x2},${y} ${x2 - T},${y + T} ${x1 + T},${y + T}`;
const v = (x: number, y1: number, y2: number) =>
  `${x},${y1} ${x + T},${y1 + T} ${x + T},${y2 - T} ${x},${y2} ${x - T},${y2 - T} ${x - T},${y1 + T}`;

const SEG = {
  a: h(7, 33, 4),
  b: v(36, 7, 33),
  c: v(36, 37, 63),
  d: h(7, 33, 66),
  e: v(4, 37, 63),
  f: v(4, 7, 33),
  g: h(7, 33, 35),
} as const;
const ORDER = Object.keys(SEG) as (keyof typeof SEG)[];

const GLYPH: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abdeg',
  '3': 'abcdg',
  '4': 'bcfg',
  '5': 'acdfg',
  '6': 'acdefg',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
};

/** One digit; a space leaves every segment dark. */
export function Digit({ ch }: { ch: string }) {
  const lit = GLYPH[ch] ?? '';
  return (
    <svg className="seg" viewBox="0 0 40 70" aria-hidden>
      {ORDER.map(k => (
        <polygon key={k} points={SEG[k]} className={lit.includes(k) ? 'on' : 'off'} />
      ))}
    </svg>
  );
}

/** The register sign: plus is the middle bar crossed by a vertical one. */
function Sign({ ch }: { ch: '+' | '-' | ' ' }) {
  return (
    <svg className="seg sign" viewBox="0 0 40 70" aria-hidden>
      <polygon points={h(6, 34, 35)} className={ch === ' ' ? 'off' : 'on'} />
      <polygon points={v(20, 21, 49)} className={ch === '+' ? 'on' : 'off'} />
    </svg>
  );
}

export function Pair({ text }: { text: string }) {
  return (
    <div className="pair">
      <Digit ch={text[0]} />
      <Digit ch={text[1]} />
    </div>
  );
}

/** Sign and five digits, like R1–R3. `text` is exactly five characters. */
export function Register({ sign, text }: { sign: '+' | '-' | ' '; text: string }) {
  return (
    <div className="reg">
      <Sign ch={sign} />
      {[...text].map((c, i) => (
        <Digit key={i} ch={c} />
      ))}
    </div>
  );
}

/** An annunciator lamp. `pulse` lights it once and lets it fade. */
export function Lamp({
  children,
  on = false,
  amber = false,
  pulse = false,
}: {
  children?: ReactNode;
  on?: boolean;
  amber?: boolean;
  pulse?: boolean;
}) {
  return (
    <div className={`lamp${amber ? ' amber' : ''}${on ? ' on' : ''}${pulse ? ' pulse' : ''}`}>{children}</div>
  );
}

/** A keypad key with what the knob gesture does printed under it. */
export function Key({ cap, hint, down = false }: { cap: string; hint: string; down?: boolean }) {
  return (
    <div className="key-wrap">
      <div className={`key${down ? ' down' : ''}`}>{cap}</div>
      <span>{hint}</span>
    </div>
  );
}
