import type { CSSProperties, ReactNode } from 'react';

/** The screen is a literal 80×24 terminal: 10×20 px cells on 800×480. */
export const COLS = 80;
export const ROWS = 24;

/** Text placed at a cell. */
export function T({
  x,
  y,
  children,
  className,
  onClick,
}: {
  x: number;
  y: number;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div className={`t${className ? ` ${className}` : ''}`} style={{ '--x': x, '--y': y } as CSSProperties} onClick={onClick}>
      {children}
    </div>
  );
}

/** Box-drawing frame, `w` columns wide including the border, with a title. */
export function boxLines(title: string, body: string[], w: number): string[] {
  const inner = w - 2;
  const head = `─ ${title} `;
  return [
    `┌${head}${'─'.repeat(Math.max(0, inner - head.length))}┐`,
    ...body.map(l => `│${fit(l, inner)}│`),
    `└${'─'.repeat(inner)}┘`,
  ];
}

export const fit = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s.padEnd(w));

/** Horizontal bar with eighth-block precision. */
export function bar(frac: number, width: number): string {
  const eighths = Math.round(Math.min(1, Math.max(0, frac)) * width * 8);
  const full = Math.floor(eighths / 8);
  const part = eighths % 8;
  const partial = part ? ' ▏▎▍▌▋▊▉'[part] : '';
  return '█'.repeat(full) + partial;
}

// 5×7 bitmap font; every pixel is drawn two cells wide so it comes out square.
const GLYPHS: Record<string, string[]> = {
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  ':': ['.', '.', '#', '.', '#', '.', '.'],
};

/**
 * Render a short string ("25:00") in block digits. Lit pixels are full
 * blocks; unlit ones are faint shade so the matrix reads like a display.
 */
export function BigText({ x, y, text, className }: { x: number; y: number; text: string; className?: string }) {
  const rows = Array.from({ length: 7 }, (_, r) =>
    [...text].map(ch => (GLYPHS[ch] ?? GLYPHS['0'])[r]),
  );
  return (
    <>
      {rows.map((cells, r) => (
        <T key={r} x={x} y={y + r} className={className}>
          {cells.map((g, i) => (
            <span key={i}>
              {[...g].map((p, j) =>
                p === '#' ? (
                  <span key={j} className="px on">
                    ██
                  </span>
                ) : (
                  <span key={j} className="px off">
                    ░░
                  </span>
                ),
              )}
              {i < cells.length - 1 ? '  ' : ''}
            </span>
          ))}
        </T>
      ))}
    </>
  );
}

/** Column width of `text` when drawn by BigText. */
export const bigWidth = (text: string) =>
  [...text].reduce((w, ch) => w + (GLYPHS[ch] ?? GLYPHS['0'])[0].length * 2, 0) + (text.length - 1) * 2;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function clock(t: number) {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function journalStamp(t: number) {
  const d = new Date(t);
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')} ${clock(t)}`;
}

export function StatusBar({ now, middle }: { now: number; middle: string }) {
  const d = new Date(now);
  const left = ' POMODORO(1)';
  const right = `${WEEKDAYS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${clock(now)} `;
  const gap = COLS - left.length - right.length - middle.length;
  const line = left + ' '.repeat(Math.floor(gap / 2)) + middle + ' '.repeat(Math.ceil(gap / 2)) + right;
  return (
    <T x={0} y={0} className="inv">
      {line}
    </T>
  );
}

/** Midnight Commander style function-key bar along the bottom row. */
export function KeyBar({ keys, actions }: { keys: [string, string][]; actions: [string, string][] }) {
  // Widest case (5 keys + 3 actions) must stay within 80 columns.
  const cells = [...keys.map(([k, l]) => [k, ` ${l}`.padEnd(5)]), ['', ''], ...actions.map(([k, l]) => [k, ` ${l}`.padEnd(7)])];
  return (
    <T x={0} y={23}>
      {cells.map(([k, l], i) =>
        k === '' ? (
          <span key={i}>{' '.repeat(2)}</span>
        ) : (
          <span key={i}>
            <span className="key"> {k}</span>
            <span className="inv">{l}</span>{' '}
          </span>
        ),
      )}
    </T>
  );
}

/** Scanlines and vignette; static, so it costs nothing per frame. */
export function Crt() {
  return <div className="crt" />;
}
