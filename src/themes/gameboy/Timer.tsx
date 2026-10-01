import { formatDrift, hhmm } from '../kit';
import { useEffect, useRef } from 'react';
import type { TimerView } from '../types';
import { textWidth, type Gfx } from './engine';
import Screen from './Screen';
import { alarmClock, coffee, HEART_EMPTY, HEART_FULL, tomato } from './sprites';

const HOLD_MS = 700;
const FLASH_MS = 1200;
/** How long the victory message stays up after a phase ends. */
const NEWS_MS = 8000;

const ENEMY = { focus: 'WORK', short: 'COFFEE', long: 'SIESTA' } as const;

/** Two lines for the dialogue box, at most 22 characters each. */
function dialogue(v: TimerView, news: boolean, holdFrac: number | null): [string, string] {
  const { clock, endsAt, now } = v;
  if (holdFrac !== null) {
    const what = { stop: 'FLEE', skip: 'SKIP', reset: 'RESET' }[v.actions.hold];
    return [`${what}?`, ''];
  }
  if (clock.kind === 'behind') return [`CLOCK IS ${formatDrift(clock.behindMs).toUpperCase()}`, 'BEHIND! SYNC PHONE.'];
  if (clock.kind === 'unverified') return ['CLOCK MAY BE WRONG!', `TAP IF ${hhmm(now)} IS OK`];
  if (news) {
    if (v.phase !== 'focus') return ['WORK FAINTED!', `TOMATO GAINED ${v.focusMinutes} EXP!`];
    return ['BREAK IS OVER!', 'PRESS: FIGHT AGAIN'];
  }
  switch (v.mode) {
    case 'running':
      return v.phase === 'focus'
        ? ['TOMATO IS FOCUSING...', `ENDS ${hhmm(endsAt)}  HOLD:FLEE`]
        : [v.phase === 'long' ? 'TOMATO TOOK A NAP!' : 'TOMATO IS RESTING...', `BACK AT ${hhmm(endsAt)}`];
    case 'paused':
      return ['TOMATO PAUSED.', `${v.countdown} LEFT  PRESS:GO`];
    default:
      return v.phase === 'focus'
        ? ['A WILD WORK APPEARED!', 'TURN:LV  PRESS:FIGHT']
        : [`${ENEMY[v.phase]} APPEARED!`, 'PRESS: TAKE A BREAK'];
  }
}

/**
 * Pokémon-style battle: the tomato fights WORK, whose HP is the time left.
 * Breaks swap the enemy for a cup of coffee and put the tomato to sleep.
 */
export default function Timer(v: TimerView) {
  const { now, today } = v;
  const holdStart = useRef<number | null>(null);
  const flashStart = useRef<number | null>(null);
  const lastFlash = useRef(v.flash);

  useEffect(() => {
    holdStart.current = v.holding ? performance.now() : null;
  }, [v.holding]);
  useEffect(() => {
    if (v.flash !== lastFlash.current) {
      lastFlash.current = v.flash;
      flashStart.current = performance.now();
    }
  }, [v.flash]);

  const t0 = performance.now();
  const news = flashStart.current !== null && t0 - flashStart.current < NEWS_MS;
  const idle = v.mode === 'idle';
  const frac = 1 - v.progress;
  const minutesLeft = v.leftMs / 60_000;

  const draw = (g: Gfx, t: number) => {
    const holdFrac = holdStart.current === null ? null : Math.min(1, (t - holdStart.current) / HOLD_MS);
    const frame = Math.floor(now / 500) % 2;
    const bob = v.mode === 'running' ? frame : 0;
    g.clear(0);

    // enemy status (top left)
    const name = ENEMY[v.phase];
    const lv = `:L${v.setMinutes}`;
    g.text(name, 8, 6);
    g.text(lv, 112 - textWidth(lv), 6);
    g.text('HP', 12, 17, 3);
    g.meter(32, 17, 80, 7, frac, frac < 0.2 ? 3 : 2);
    g.bracket(4, 2, 114, 28);

    // enemy sprite (top right)
    const enemy = v.phase === 'focus' ? alarmClock(Math.min(1, minutesLeft / 60)) : coffee(frame);
    g.sprite(enemy, 150, 1 + (v.phase === 'focus' ? bob : 0), 2);

    // hero (bottom left), asleep on breaks
    g.sprite(tomato(v.phase !== 'focus' && !idle), 14, 34 + (v.phase === 'focus' ? bob : 0), 3);
    if (v.phase !== 'focus' && !idle) g.text(frame ? 'z' : 'Z', 62, 36 + frame * 3, 2);

    // hero status (bottom right): the countdown in big digits, hearts for the set
    const lvl = `:L${today.sessions}`;
    g.text('TOMATO', 88, 40);
    g.text(lvl, 194 - textWidth(lvl), 40);
    const clock = v.countdown;
    const blink = v.mode === 'paused' && frame === 1;
    if (!blink) g.text(clock, 194 - textWidth(clock, 16), 52, 3, 16);
    for (let i = 0; i < v.set.length; i++) {
      g.sprite(i < v.cycle ? HEART_FULL : HEART_EMPTY, 156 + i * 10, 72, 1);
    }
    g.text('SET', 88, 71, 2);
    g.bracket(84, 36, 114, 46);

    // dialogue
    const [l1, l2] = dialogue(v, news, holdFrac);
    g.box(0, 84, 200, 36);
    g.text(l1, 9, 93);
    g.text(l2, 9, 106);
    if (holdFrac !== null) g.meter(9, 106, 120, 7, holdFrac);
    // blinking "more" arrow, as when a game waits for a button
    if (idle && holdFrac === null && v.clock.kind === 'ok' && !news && frame) {
      for (let r = 0; r < 4; r++) g.rect(184 + r, 107 + r, 7 - 2 * r, 1, 3);
    }
  };

  return (
    <div className={`gb-root mode-${v.mode}`} {...v.knob}>
      <Screen
        draw={draw}
        animating={v.holding || news}
        invert={t => flashStart.current !== null && t - flashStart.current < FLASH_MS && Math.floor((t - flashStart.current) / 150) % 2 === 0}
      >
        {/* touch targets over the canvas */}
        <div
          className="hit hit-dialogue"
          onPointerDown={e => v.clock.kind === 'unverified' && e.stopPropagation()}
          onClick={v.clock.kind === 'unverified' ? v.trustClock : undefined}
        />
        <div className="hit hit-status" onPointerDown={e => e.stopPropagation()} onClick={v.toggleHistory} />
      </Screen>
    </div>
  );
}
