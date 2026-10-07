import { formatDrift, formatDuration, hhmm } from '../kit';
import type { TimerView } from '../types';
import { Key, Lamp, Pair, Register } from './parts';

const FIVE_MIN = 5 * 60_000;
const ONE_MIN = 60_000;

const PRESS = { start: 'START', pause: 'PAUSE', resume: 'RESUME' } as const;
const HOLD = { stop: 'STOP', skip: 'SKIP', reset: 'RESET' } as const;

/**
 * Each focus session is a lunar landing: P63 braking, P64 approach for the
 * last five minutes, P66 manual descent for the last one. Breaks idle in P00;
 * the long break that closes a set is P68, touchdown confirmed.
 */
function program(v: TimerView): string {
  if (v.phase === 'focus') {
    if (v.mode === 'idle' || v.leftMs > FIVE_MIN) return '63';
    return v.leftMs > ONE_MIN ? '64' : '66';
  }
  return v.phase === 'long' ? '68' : '00';
}

/** Verb and noun, and whether they flash: the computer is waiting on the crew. */
function verbNoun(v: TimerView): [string, string, boolean] {
  if (v.mode === 'paused') return ['50', '25', true]; // please perform
  if (v.mode === 'idle') return v.phase === 'focus' ? ['99', '62', true] : ['37', '00', true]; // go for ignition / pick a program
  return v.phase === 'focus' ? ['16', '68', false] : ['16', '65', false];
}

/** "14:58" -> "14 58", right-aligned in five places. */
const reg = (s: string) => s.replace(':', ' ').padStart(5, ' ');

/** COMP ACTY flicker, deterministic per quarter second. */
const busy = (now: number) => Math.imul(Math.floor(now / 250) | 0, 0x9e3779b1) >>> 28 < 7;

/**
 * Apollo Block II DSKY: annunciator lamps on the left, the green
 * electroluminescent display on the right, keys and a checklist card below.
 */
export default function Timer(v: TimerView) {
  const running = v.mode === 'running';
  const tick = Math.floor(v.now / 400) % 2 === 0;
  const [verb, noun, waiting] = verbNoun(v);
  const vnLit = !waiting || tick;
  const low = running && v.phase === 'focus' && v.leftMs <= FIVE_MIN;
  const manual = low && v.leftMs <= ONE_MIN;

  return (
    <div key={v.flash} className={`dsky${v.flash ? ' lamptest' : ''}`}>
      <div className="annunciator">
        <Lamp key={`up${v.bump}`} pulse={v.bump > 0}>UPLINK<br />ACTY</Lamp>
        <Lamp on={v.mode === 'idle'}>NO ATT</Lamp>
        <Lamp on={v.mode === 'paused'}>STBY</Lamp>
        <Lamp on={v.holding}>KEY REL</Lamp>
        <Lamp>OPR ERR</Lamp>
        <Lamp />
        <Lamp />
        <Lamp amber>TEMP</Lamp>
        <Lamp amber>GIMBAL<br />LOCK</Lamp>
        <Lamp amber on={v.clock.kind === 'behind' ? tick : v.clock.kind === 'unverified'}>PROG</Lamp>
        <Lamp amber>RESTART</Lamp>
        <Lamp amber>TRACKER</Lamp>
        <Lamp amber on={low && (!manual || tick)}>ALT</Lamp>
        <Lamp amber on={low && (!manual || !tick)}>VEL</Lamp>
      </div>

      <div className="el" {...v.knob}>
        <div className="el-row">
          <div className={`comp-acty${running && busy(v.now) ? ' on' : ''}`}>
            COMP
            <br />
            ACTY
          </div>
          <div className="field">
            <div className="tag">PROG</div>
            <Pair text={program(v)} />
          </div>
        </div>
        <div className="el-row">
          <div className="field">
            <div className="tag">VERB</div>
            <Pair text={vnLit ? verb : '  '} />
          </div>
          <div className="field">
            <div className="tag">NOUN</div>
            <Pair text={vnLit ? noun : '  '} />
          </div>
        </div>
        <Register sign="-" text={reg(v.countdown)} />
        <Register sign={v.mode === 'paused' ? ' ' : '+'} text={v.mode === 'paused' ? '     ' : reg(hhmm(v.endsAt))} />
        <Register sign="+" text={String(Math.min(v.today.minutes, 99999)).padStart(5, '0')} />
      </div>

      <div className="deck">
        <Key cap="PRO" hint={`PRESS · ${PRESS[v.actions.press]}`} />
        <Key cap="RSET" hint={`HOLD · ${HOLD[v.actions.hold]}`} down={v.holding} />
        <Key cap="+ −" hint={v.actions.turn === 'set' ? 'TURN · SET' : 'TURN · ±1 MIN'} />
        {v.clock.kind !== 'ok' ? (
          <div className="card alarm" onClick={v.clock.kind === 'unverified' ? v.trustClock : undefined}>
            <b>PROGRAM ALARM {v.clock.kind === 'behind' ? '1202' : '1201'}</b>
            <span>
              {v.clock.kind === 'behind'
                ? `CLOCK ${formatDrift(v.clock.behindMs).toUpperCase()} BEHIND — CONNECT PHONE`
                : `CLOCK UNVERIFIED — TAP IF ${hhmm(v.now)} IS RIGHT`}
            </span>
          </div>
        ) : (
          <div className="card" onClick={v.toggleHistory}>
            <b>
              LANDINGS
              <span className="slots">
                {v.set.map((s, i) => (
                  <i key={i} className={s} />
                ))}
              </span>
            </b>
            <span>
              TODAY {v.today.sessions} · {formatDuration(v.today.minutes).toUpperCase()} · STREAK {v.streak}
            </span>
            <span className="legend">R1 TIME TO GO · R2 ENDS · R3 MIN TODAY · 4 LOG</span>
          </div>
        )}
      </div>
    </div>
  );
}
