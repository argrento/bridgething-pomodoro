import { useRef } from 'react';
import { formatDrift, hhmm } from '../kit';
import type { TimerView } from '../types';
import {
  BLACK,
  DIM,
  END_X,
  face,
  Fire,
  GREY,
  H,
  keycard,
  KEY_COLORS,
  RED,
  renderView,
  rgb,
  START_X,
  statusBar,
  text3,
  text5,
  VIEW_H,
  W,
  WHITE,
  width3,
  width5,
  YELLOW,
  type Frame,
  type Mood,
} from './engine';
import Screen from './Screen';

const HOLD_MS = 700;
const TALLY_MS = 1600;

/** The warning line, when the clock can't be trusted. */
function warning(v: TimerView): string | null {
  if (v.clock.kind === 'behind') return `CLOCK ${formatDrift(v.clock.behindMs).toUpperCase()} BEHIND - CONNECT PHONE`;
  if (v.clock.kind === 'unverified') return `CLOCK MAY BE WRONG - TAP IF ${hhmm(v.now)} IS OK`;
  return null;
}

const centre = (w: number) => Math.round((W - w) / 2);
/** Where each scene prints the clock warning (logical rows); the tap target follows it. */
const WARN_Y = { title: 2, level: VIEW_H - 8, intermission: H - 7 } as const;

/**
 * A 1990s shooter in spirit, with original art. Idle focus is a title
 * screen over fire; running focus walks a corridor toward the exit as the
 * time runs out, with the countdown and a status bar; finishing melts the
 * screen into an intermission tally, and the break counts down there.
 */
export default function Timer(v: TimerView) {
  const holdStart = useRef<number | null>(null);
  const tallyStart = useRef<number>(0);
  const lastFlash = useRef(v.flash);
  const fire = useRef(new Fire(46));
  const look = useRef<{ dir: -1 | 0 | 1; until: number }>({ dir: 0, until: 0 });

  if (v.holding && holdStart.current === null) holdStart.current = performance.now();
  if (!v.holding) holdStart.current = null;
  if (v.flash !== lastFlash.current) {
    lastFlash.current = v.flash;
    tallyStart.current = performance.now();
  }

  const scene = v.phase !== 'focus' ? 'intermission' : v.mode === 'idle' ? 'title' : 'level';
  const level = `E1M${Math.min(v.cycle + 1, v.set.length)}`;
  const warn = warning(v);

  const draw = (f: Frame, t: number) => {
    const holdFrac = holdStart.current === null ? 0 : Math.min(1, (t - holdStart.current) / HOLD_MS);

    if (scene === 'title') {
      f.fill(BLACK);
      fire.current.step(1);
      fire.current.draw(f, H - fire.current.h);
      text5(f, 'FOCUS', centre(width5('FOCUS', 4)), 8, 4);
      text3(f, `${level}  -  SET ${v.setMinutes} MIN`, centre(width3(`${level}  -  SET ${v.setMinutes} MIN`, 2)), 44, WHITE, 2, true);
      if (Math.floor(t / 600) % 2 === 0) text3(f, 'PRESS KNOB TO START', centre(width3('PRESS KNOB TO START')), 60, YELLOW, 1, true);
      text3(f, 'TURN: MINUTES   HOLD: RESET SET', centre(width3('TURN: MINUTES   HOLD: RESET SET')), 68, GREY, 1, true);
      if (warn) text3(f, warn, 2, WARN_Y.title, YELLOW, 1, true);
    }

    if (scene === 'level') {
      const progress = v.progress;
      const running = v.mode === 'running';
      const bob = running ? Math.sin(t / 180) * 1.2 : 0;
      const sway = running ? Math.sin(t / 1300) * 0.035 : 0;
      // a flickering sector light, now and then
      const light = running && Math.floor(t / 100) % 37 === 0 ? 0.7 : 1;
      renderView(f, START_X + (END_X - START_X) * progress, 3.5, sway, bob, light);
      if (v.mode === 'paused') f.tint(BLACK, 0.55, 0, VIEW_H);
      if (holdFrac > 0) f.tint(RED, holdFrac * 0.55, 0, VIEW_H);

      text5(f, v.countdown, centre(width5(v.countdown, 3)), 4, 3);
      text3(f, level, 2, 2, GREY, 1, true);
      if (v.mode === 'paused') {
        text5(f, 'PAUSE', centre(width5('PAUSE', 3)), 36, 3, WHITE, GREY);
        text3(f, 'PRESS TO RESUME', centre(width3('PRESS TO RESUME')), 62, WHITE, 1, true);
      }
      if (holdFrac > 0) text3(f, 'HOLD TO QUIT THIS FOCUS...', centre(width3('HOLD TO QUIT THIS FOCUS...')), 30, WHITE, 1, true);
      if (warn) text3(f, warn, 2, WARN_Y.level, YELLOW, 1, true);

      // status bar: minutes left · percent left · face · today · the set's keycards
      statusBar(f);
      const pct = Math.round((1 - progress) * 100);
      const num = (s: string, x: number, w: number) => text5(f, s, x + Math.round((w - width5(s, 2)) / 2), VIEW_H + 6, 2);
      const label = (s: string, x: number, w: number) => text3(f, s, x + Math.round((w - width3(s)) / 2), H - 10, GREY);
      num(String(v.minutesLeft), 2, 40);
      label('MIN', 2, 40);
      num(String(pct), 46, 36);
      text3(f, '%', 84, VIEW_H + 13, RED, 1);
      label('LEFT', 46, 44);
      num(String(v.today.sessions), 124, 40);
      label('TODAY', 124, 40);
      if (t > look.current.until) look.current = { dir: ([-1, 0, 0, 1] as const)[(Math.random() * 4) | 0], until: t + 1200 + Math.random() * 1500 };
      const mood: Mood = v.mode === 'paused' ? 'sleep' : pct > 60 ? 'grin' : pct > 30 ? 'calm' : pct > 10 ? 'tense' : 'hurt';
      face(f, 95, VIEW_H + 1, mood, look.current.dir);
      v.set.forEach((s, i) => {
        const on = s === 'done' || (s === 'live' && Math.floor(t / 500) % 2 === 0);
        keycard(f, 171 + (i % 2) * 13, VIEW_H + 7 + Math.floor(i / 2) * 9, KEY_COLORS[i], on);
      });
      label('SET', 168, 30);
    }

    if (scene === 'intermission') {
      for (let y = 0; y < H; y++) f.rect(0, y, W, 1, rgb(30 + ((y * 50) / H) | 0, 4, 4));
      const tally = Math.min(1, (t - tallyStart.current) / TALLY_MS);
      const last = v.recent.at(-1);
      const kills = last ? Math.min(100, Math.round((last.minutes / v.focusMinutes) * 100)) : 0;
      const items = Math.round((v.cycle / v.set.length) * 100);
      const done = v.cycle === 0 ? v.set.length : v.cycle;
      const title = `E1M${done} FINISHED`;
      text3(f, title, centre(width3(title, 2)), 5, WHITE, 2, true);
      const rows: [string, string][] = [
        ['KILLS', `${Math.round(kills * tally)}%`],
        ['ITEMS', `${Math.round(items * tally)}%`],
        ['SECRET', String(Math.round(v.streak * tally))],
        ['PAR', `${v.focusMinutes}:00`],
      ];
      rows.forEach(([k, val], i) => {
        text3(f, k, 36, 20 + i * 12, RED, 2, true);
        text3(f, val, 164 - width3(val, 2), 20 + i * 12, WHITE, 2, true);
      });
      const entering = v.mode === 'idle' ? 'PRESS KNOB TO REST' : v.phase === 'long' ? 'ENTERING LONG BREAK' : 'ENTERING BREAK';
      text3(f, entering, centre(width3(entering)), 69, v.mode === 'idle' ? YELLOW : GREY, 1, true);
      text5(f, v.countdown, centre(width5(v.countdown, 3)), 78, 3);
      if (v.mode === 'paused') text3(f, 'PAUSED', centre(width3('PAUSED', 2)), 102, WHITE, 2, true);
      if (holdFrac > 0) f.tint(RED, holdFrac * 0.45);
      if (warn) text3(f, warn, 2, WARN_Y.intermission, YELLOW, 1, true);
      else text3(f, '4: EPISODE LOG   BACK: SKINS', centre(width3('4: EPISODE LOG   BACK: SKINS')), H - 7, DIM, 1);
    }
  };

  const animating = v.mode === 'running' || scene === 'title' || v.holding || performance.now() - tallyStart.current < TALLY_MS;
  return (
    <div className={`doom-root mode-${v.mode}`} {...v.knob}>
      <Screen draw={draw} animating={animating} wipe={v.flash}>
        <div
          className="hit hit-warn"
          style={{ top: `${WARN_Y[scene] * 4 - 8}px` }}
          onPointerDown={e => v.clock.kind === 'unverified' && e.stopPropagation()}
          onClick={v.clock.kind === 'unverified' ? v.trustClock : undefined}
        />
        {scene === 'level' && <div className="hit hit-bar" onPointerDown={e => e.stopPropagation()} onClick={v.toggleHistory} />}
      </Screen>
    </div>
  );
}
