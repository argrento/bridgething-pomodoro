import { useRef } from 'react';
import { formatDrift, formatDuration, hhmm } from '../kit';
import type { TimerView } from '../types';
import { engine, fma, memo, PHASE_NAME, phaseOf, special, THRUST_LIMIT, type Phase } from './flight';
import Gauge from './Gauge';

/** How long a newly engaged mode keeps its white box, as on the real annunciator. */
const BOX_MS = 10_000;

/**
 * A jetliner's engine and warning display. Each focus session is one leg:
 * take-off thrust, climb, cruise, descent, approach, flare and RETARD at
 * the end; breaks are parked at the gate with the engines spooled down.
 */
export default function Timer(v: TimerView) {
  const phase = phaseOf(v);
  const paused = v.mode === 'paused';
  const changedAt = useRef<{ phase: Phase | null; at: number }>({ phase: null, at: 0 });
  if (changedAt.current.phase !== phase) changedAt.current = { phase, at: changedAt.current.phase === null ? -Infinity : v.now };
  const boxed = v.now - changedAt.current.at < BOX_MS;
  const blink = Math.floor(v.now / 500) % 2 === 0;

  const e1 = engine(phase, 0, v.now);
  const e2 = engine(phase, 1, v.now);
  const limit = THRUST_LIMIT[phase];
  const cells = fma(phase, paused);
  const left = memo(phase, v);
  const right = special(phase);
  // during a focus the leg being flown; on a break the leg just landed (a long break follows leg 4)
  const legShown = v.phase === 'focus' ? Math.min(v.cycle + 1, v.set.length) : v.cycle === 0 ? v.set.length : v.cycle;

  const caution =
    v.clock.kind === 'behind'
      ? { title: `CLOCK ${formatDrift(v.clock.behindMs).toUpperCase()} BEHIND`, action: '-CONNECT PHONE' }
      : v.clock.kind === 'unverified'
        ? { title: 'CLOCK UNVERIFIED', action: `-TAP IF ${hhmm(v.now)} OK` }
        : paused
          ? { title: 'A/THR OFF', action: '-PRESS TO RESUME' }
          : null;

  const n1Ticks = [0, 20, 40, 60, 80, 100];
  return (
    <div className={`ecam phase-${phase} mode-${v.mode}`} {...v.knob}>
      <div className="fma">
        {cells.map((c, i) => (
          <div key={i} className="fma-col">
            <span className={`fma-main tone-${c.tone}${i === 0 && boxed && c.text ? ' boxed' : ''}${c.tone === 'amber' && blink ? ' flash' : ''}`}>{c.text}</span>
            {c.armed && <span className="fma-armed tone-cyan">{c.armed}</span>}
          </div>
        ))}
      </div>

      <svg className="ewd" viewBox="0 0 470 268" aria-hidden="true">
        <Gauge cx={118} cy={92} r={70} value={e1.n1} max={110} ticks={n1Ticks} tickLabel={t => String(t / 10)} redFrom={101} limit={limit?.[1]} digits={e1.n1.toFixed(1)} live={e1.running} />
        <Gauge cx={340} cy={92} r={70} value={e2.n1} max={110} ticks={n1Ticks} tickLabel={t => String(t / 10)} redFrom={101} limit={limit?.[1]} digits={e2.n1.toFixed(1)} live={e2.running} />
        <text x="235" y="96" className="label" textAnchor="middle">N1</text>
        <text x="235" y="112" className="unit" textAnchor="middle">%</text>
        <Gauge cx={118} cy={196} r={46} value={e1.egt} max={1100} ticks={[0, 500, 1000]} tickLabel={() => ''} amberFrom={850} redFrom={950} digits={String(Math.round(e1.egt))} live={e1.running} />
        <Gauge cx={340} cy={196} r={46} value={e2.egt} max={1100} ticks={[0, 500, 1000]} tickLabel={() => ''} amberFrom={850} redFrom={950} digits={String(Math.round(e2.egt))} live={e2.running} />
        <text x="235" y="200" className="label" textAnchor="middle">EGT</text>
        <text x="235" y="216" className="unit" textAnchor="middle">°C</text>
        <text x="235" y="261" className="label" textAnchor="middle">N2 %</text>
        <text x="150" y="261" className="value" textAnchor="end">{e1.n2.toFixed(1)}</text>
        <text x="320" y="261" className="value" textAnchor="start">{e2.n2.toFixed(1)}</text>
      </svg>

      <aside className="side" onClick={e => { e.stopPropagation(); v.toggleHistory(); }} onPointerDown={e => e.stopPropagation()}>
        <div className="thr-limit">
          {limit ? (
            <>
              <span className="tone-cyan">{limit[0]}</span>
              <span className="tone-green">{limit[1].toFixed(1)}</span>
              <span className="tone-cyan unit">%</span>
            </>
          ) : (
            <span className="tone-white dim">ENG OFF</span>
          )}
        </div>
        <div className="ete-label tone-cyan">{v.phase === 'focus' ? 'ETE' : phase === 'cold' ? 'REST' : 'TURN'}</div>
        <div className={`ete tone-green${paused && blink ? ' dim' : ''}`}>{v.countdown}</div>
        <div className="phase-name tone-white">{PHASE_NAME[phase]}</div>
        <div className="legs">
          <span className="tone-cyan">LEG</span>
          <span className="tone-green">
            {legShown}/{v.set.length}
          </span>
          <span className="pips">
            {v.set.map((s, i) => (
              <i key={i} className={s === 'live' ? (blink ? 'live' : 'done') : s} />
            ))}
          </span>
        </div>
        <div className="kv">
          <span className="tone-cyan">BLOCK TODAY</span>
          <span className="tone-green">{formatDuration(v.today.minutes).replace(' ', '').toUpperCase()}</span>
        </div>
        <div className="kv">
          <span className="tone-cyan">LEGS · DUTY DAYS</span>
          <span className="tone-green">
            {v.today.sessions} · {v.streak}
          </span>
        </div>
      </aside>

      <section className="memo">
        <div className="memo-left">
          {phase === 'flare' && <div className={`callout${blink ? '' : ' dim'}`}>RETARD</div>}
          {phase !== 'flare' && left.map((l, i) => <div key={i} className={`tone-${l.tone}`}>{l.text}</div>)}
        </div>
        <div
          className="memo-right"
          onPointerDown={e => v.clock.kind === 'unverified' && e.stopPropagation()}
          onClick={v.clock.kind === 'unverified' ? v.trustClock : undefined}
        >
          {caution && (
            <>
              <div className="tone-amber">{caution.title}</div>
              <div className="tone-cyan">{caution.action}</div>
            </>
          )}
          {right.map((l, i) => <div key={i} className={`tone-${l.tone}`}>{l.text}</div>)}
          {v.mode === 'idle' && !caution && <div className="tone-cyan">{v.phase === 'focus' ? '-PRESS TO TAKE OFF' : '-PRESS TO PARK'}</div>}
          {v.mode === 'idle' && v.phase === 'focus' && !caution && <div className="tone-cyan">-TURN TO SET ETE</div>}
        </div>
      </section>

      {v.holding && (
        <div className={`master-caut${blink ? '' : ' dim'}`}>
          MASTER
          <br />
          CAUT
        </div>
      )}
      {v.holding && <div className="hold-msg tone-amber">HOLD TO END LEG</div>}
    </div>
  );
}
