/** Cathode stacking order inside an IN-14 tube, front to back. */
const CATHODES = ['1', '6', '2', '7', '5', '0', '4', '9', '8', '3'];

/**
 * One Nixie tube. Every numeral is always there as a dim wire; the lit one
 * glows, and switching crossfades like the afterglow of a real cathode.
 */
export function Tube({ digit, size = 'big' }: { digit: string; size?: 'big' | 'small' }) {
  return (
    <span className={`tube ${size}`}>
      <span className="cathodes">
        {CATHODES.map(d => (
          <span key={d} className={d === digit ? 'on' : ''}>
            {d}
          </span>
        ))}
      </span>
      <span className="mesh" />
      <span className="glass" />
    </span>
  );
}

/** Digits as tubes; ':' becomes a pair of neon dots. */
export function TubeRow({ text, size = 'big', blink }: { text: string; size?: 'big' | 'small'; blink?: boolean }) {
  return (
    <span className={`tubes ${size}`}>
      {[...text].map((c, i) =>
        c === ':' ? (
          <span key={`c${i}`} className={`neon-colon${blink ? ' blink' : ''}`}>
            <i />
            <i />
          </span>
        ) : (
          <Tube key={i} digit={c} size={size} />
        ),
      )}
    </span>
  );
}

/** IN-9 style bargraph: a neon column `frac` long. */
export function Bargraph({ frac, vertical }: { frac: number; vertical?: boolean }) {
  const pct = `${Math.round(Math.min(1, Math.max(0, frac)) * 1000) / 10}%`;
  return (
    <span className={`in9${vertical ? ' vertical' : ''}`}>
      <span className="column" style={vertical ? { height: pct } : { width: pct }} />
    </span>
  );
}

/** A neon indicator lamp with an engraved label plate. */
export function Lamp({ state, label }: { state: 'on' | 'off' | 'blink' | 'warn'; label?: string }) {
  return (
    <span className="lamp-unit">
      <span className={`lamp ${state}`} />
      {label && <span className="plate">{label}</span>}
    </span>
  );
}
