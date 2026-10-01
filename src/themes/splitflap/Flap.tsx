import { useEffect, useRef, useState } from 'react';

/** The order characters sit on a real flap drum. */
const DRUM = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.-/!?+';
/** A long riffle is fun once; past this many flips we skip ahead. */
const MAX_STEPS = 8;
const FLIP_MS = 240;
const RIFFLE_MS = 70;

const norm = (ch: string) => (DRUM.includes(ch) ? ch : ch === '' ? ' ' : ch);

/** Characters between `from` and `to`, walking the drum forward, capped. */
function path(from: string, to: string): string[] {
  const a = DRUM.indexOf(from);
  const b = DRUM.indexOf(to);
  if (a < 0 || b < 0) return [to];
  const steps: string[] = [];
  for (let i = (a + 1) % DRUM.length; ; i = (i + 1) % DRUM.length) {
    steps.push(DRUM[i]);
    if (i === b) break;
  }
  return steps.length > MAX_STEPS ? steps.slice(-MAX_STEPS) : steps;
}

/**
 * One split-flap cell. On change, the top half of the old character folds
 * down while the new bottom half swings into place. With `riffle`, it walks
 * the drum through the characters in between, like a Solari board.
 */
export function Flap({ ch, riffle = true, className }: { ch: string; riffle?: boolean; className?: string }) {
  const target = norm(ch);
  const [cur, setCur] = useState(target);
  const [next, setNext] = useState<string | null>(null);
  const queue = useRef<string[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (target === (next ?? cur) && !queue.current.length) return;
    queue.current = riffle ? path(next ?? cur, target) : [target];
    if (timer.current === null) step();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  useEffect(() => () => void (timer.current !== null && clearTimeout(timer.current)), []);

  function step() {
    const n = queue.current.shift();
    if (n === undefined) {
      timer.current = null;
      return;
    }
    const ms = queue.current.length ? RIFFLE_MS : FLIP_MS;
    setNext(n);
    timer.current = window.setTimeout(() => {
      setCur(n);
      setNext(null);
      timer.current = window.setTimeout(step, 0);
    }, ms);
  }

  const flipping = next !== null;
  const style = flipping ? { ['--flip' as string]: `${queue.current.length ? RIFFLE_MS : FLIP_MS}ms` } : undefined;
  return (
    <span className={`flap${className ? ` ${className}` : ''}`} style={style}>
      <span className="half top">
        <span>{flipping ? next : cur}</span>
      </span>
      <span className="half bottom">
        <span>{cur}</span>
      </span>
      {flipping && (
        <>
          <span key={`f${next}`} className="half top fold">
            <span>{cur}</span>
          </span>
          <span key={`u${next}`} className="half bottom unfold">
            <span>{next}</span>
          </span>
        </>
      )}
    </span>
  );
}

/** A row of flaps showing `text`, padded or cut to `len` cells. */
export function FlapText({
  text,
  len,
  riffle = true,
  className,
}: {
  text: string;
  len: number;
  riffle?: boolean;
  className?: string;
}) {
  const cells = text.toUpperCase().padEnd(len).slice(0, len);
  return (
    <span className={`flaps${className ? ` ${className}` : ''}`}>
      {[...cells].map((c, i) => (
        <Flap key={i} ch={c} riffle={riffle} />
      ))}
    </span>
  );
}
