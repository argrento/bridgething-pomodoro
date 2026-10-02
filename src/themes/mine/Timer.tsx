import { useRef } from 'react';
import { formatDrift, hhmm } from '../kit';
import type { TimerView } from '../types';
import {
  blockAt,
  BS,
  COLS,
  cracks,
  digits,
  GOLD,
  GREY,
  H,
  heart,
  hotbar,
  miner,
  mix,
  prng,
  rgb,
  SHAFT,
  shade,
  text,
  TEX,
  W,
  WHITE,
  width3,
  width5,
  type Block,
  type Frame,
} from './engine';
import Screen from './Screen';

const HOLD_MS = 700;
const CHEER_MS = 2500;
/** Screen row the miner stands on while digging. */
const MINER_ROW = 4;

const DAY_TOP = rgb(96, 150, 250);
const DAY_LOW = rgb(176, 210, 255);
const NIGHT_TOP = rgb(8, 10, 34);
const NIGHT_LOW = rgb(30, 36, 80);

function sky(f: Frame, rows: number, top: number, low: number) {
  for (let y = 0; y < rows * BS; y++) f.rect(0, y, W, 1, mix(top, low, y / Math.max(1, rows * BS)));
}

/**
 * Side view of the ground. Focus digs straight down one block a minute,
 * the current block cracking as the seconds pass, toward a chest at the
 * target depth. Breaks are night on the surface, asleep in a bed.
 */
export default function Timer(v: TimerView) {
  const holdStart = useRef<number | null>(null);
  const cheerAt = useRef(-Infinity);
  const lastFlash = useRef(v.flash);
  const debris = useRef<{ minute: number; at: number; color: number }>({ minute: -1, at: -Infinity, color: 0 });
  if (v.holding && holdStart.current === null) holdStart.current = performance.now();
  if (!v.holding) holdStart.current = null;
  if (v.flash !== lastFlash.current) {
    lastFlash.current = v.flash;
    cheerAt.current = performance.now();
  }

  const target = Math.max(1, Math.round(v.totalMs / 60_000));
  const elapsed = v.mode === 'idle' ? 0 : v.totalMs - v.leftMs;
  const minute = Math.min(target - 1, Math.floor(elapsed / 60_000));
  const seed = Math.floor(v.schedule[0].at / 60_000);
  const scene = v.phase !== 'focus' ? 'night' : v.mode === 'idle' ? 'day' : 'dig';

  const draw = (f: Frame, t: number) => {
    const holdFrac = holdStart.current === null ? 0 : Math.min(1, (t - holdStart.current) / HOLD_MS);
    const swing = v.mode === 'running' && Math.floor(t / 250) % 2 === 0;

    if (scene === 'dig' || scene === 'day') {
      // which depth sits at the top of the screen
      const top = scene === 'day' ? -6 : minute - 1 - MINER_ROW;
      const skyRows = Math.max(0, -top);
      if (skyRows) sky(f, skyRows, DAY_TOP, DAY_LOW);
      if (skyRows) {
        f.rect(18, 8, 10, 10, rgb(255, 240, 150));
        const cx = ((t / 400) % (W + 60)) - 40;
        f.rect(cx, 14, 34, 6, WHITE);
        f.rect(cx + 6, 10, 18, 5, WHITE);
        f.rect(((t / 650 + 120) % (W + 60)) - 40, 26, 26, 5, rgb(236, 240, 250));
      }
      const minerDepth = scene === 'day' ? -1 : minute - 1;
      for (let r = 0; r < H / BS; r++) {
        const depth = top + r;
        if (depth < 0) continue;
        for (let c = 0; c < COLS; c++) {
          let b: Block = blockAt(seed, c, depth, target);
          if (c === SHAFT && depth < minute && scene === 'dig') b = 'air';
          const x = c * BS;
          const y = r * BS;
          if (b === 'air') f.rect(x, y, BS, BS, shade(TEX.stone[0], 0.35));
          else {
            const tx = TEX[b];
            for (let j = 0; j < BS; j++) for (let i = 0; i < BS; i++) f.buf[(y + j) * W + x + i] = tx[j * BS + i];
          }
          // light: daylight fades with depth; the helmet lamp lights around the miner
          const ambient = Math.max(0, 1 - depth / 10);
          const d = Math.hypot(c - SHAFT, depth - minerDepth);
          const lamp = Math.max(0, 1 - d / 5.5);
          f.dim(x, y, BS, BS, Math.max(0.1, Math.min(1, Math.max(ambient, lamp))));
        }
      }
      const minerY = (minerDepth - top) * BS;
      if (scene === 'dig') cracks(f, SHAFT * BS, minerY + BS, (elapsed % 60_000) / 60_000);
      miner(f, SHAFT * BS, minerY, swing);

      // a burst of debris when a block breaks
      if (scene === 'dig' && minute !== debris.current.minute) {
        if (debris.current.minute >= 0) debris.current.at = t;
        debris.current.minute = minute;
        debris.current.color = TEX[blockAt(seed, SHAFT, Math.max(0, minute - 1), target) === 'air' ? 'stone' : blockAt(seed, SHAFT, Math.max(0, minute - 1), target) as Exclude<Block, 'air'>][44];
      }
      const since = t - debris.current.at;
      if (since < 700) {
        const n = prng(debris.current.minute);
        for (let i = 0; i < 10; i++) {
          const vx = (n() - 0.5) * 30;
          const vy = -n() * 25;
          const s = since / 1000;
          f.rect(SHAFT * BS + 5 + vx * s, minerY + 8 + vy * s + 60 * s * s, 2, 2, debris.current.color);
        }
      }

      if (scene === 'day') {
        const msg = 'PRESS TO DIG';
        if (Math.floor(t / 600) % 2 === 0) text(f, msg, Math.round((W - width3(msg, 2)) / 2), 44, WHITE, 2);
        const d = `TURN: DEPTH ${target}`;
        text(f, d, Math.round((W - width3(d)) / 2), 60, GOLD);
      }
    }

    if (scene === 'night') {
      sky(f, 8, NIGHT_TOP, NIGHT_LOW);
      const stars = prng(42);
      for (let i = 0; i < 40; i++) {
        const sx = stars() * W;
        const sy = stars() * 70;
        if ((Math.floor(t / 700) + i) % 9) f.rect(sx, sy, 1, 1, WHITE);
      }
      f.rect(20, 10, 12, 12, rgb(230, 232, 210));
      f.rect(23, 13, 3, 3, rgb(190, 192, 170));
      for (let c = 0; c < COLS; c++) {
        for (let r = 8; r < 12; r++) {
          const tx = TEX[r === 8 ? 'grass' : 'dirt'];
          for (let j = 0; j < BS; j++) for (let i = 0; i < BS; i++) f.buf[(r * BS + j) * W + c * BS + i] = tx[j * BS + i];
          f.dim(c * BS, r * BS, BS, BS, 0.45);
        }
      }
      // bed, sleeper, campfire
      const bx = SHAFT * BS - 6;
      f.rect(bx, 74, 22, 6, rgb(180, 30, 40));
      f.rect(bx, 72, 6, 4, WHITE);
      f.rect(bx, 80, 2, 0, rgb(120, 80, 40));
      if (v.mode !== 'idle') miner(f, bx + 2, 64, false, true);
      if (v.mode === 'running') text(f, Math.floor(t / 700) % 2 ? 'Z' : 'Z Z', bx + 10, 56, WHITE);
      const fx = bx + 34;
      f.rect(fx, 77, 10, 3, rgb(100, 66, 34));
      const flick = Math.floor(t / 180) % 3;
      f.rect(fx + 2, 71 + flick, 6, 6 - flick, rgb(250, 140, 30));
      f.rect(fx + 4, 69 + flick, 2, 4, rgb(255, 220, 90));
      const msg = v.mode === 'idle' ? 'PRESS TO SLEEP' : v.phase === 'long' ? 'A LONG NIGHT...' : 'RESTING...';
      text(f, msg, Math.round((W - width3(msg, 2)) / 2), 40, v.mode === 'idle' ? GOLD : WHITE, 2);
    }

    // HUD: countdown, depth, hearts for the set, hotbar of today's haul
    digits(f, v.countdown, W - 4 - width5(v.countdown, 3), 3, 3);
    if (scene === 'dig') {
      text(f, `Y -${minute}`, 3, 3, WHITE, 2);
      text(f, `CHEST AT -${target}`, 3, 16, GREY);
    }
    v.set.forEach((s, i) => heart(f, Math.round((W - 9 * 12 - 1) / 2) + i * 9, H - 23, s === 'done' ? 'full' : s === 'live' ? (Math.floor(t / 500) % 2 ? 'half' : 'full') : 'empty'));
    hotbar(
      f,
      [
        { kind: 'pick' },
        { kind: 'diamond', count: v.today.sessions },
        { kind: 'coal', count: v.today.minutes },
        { kind: 'emerald', count: v.streak },
      ],
      0,
    );

    // chat line, bottom left above the hotbar
    let chat: string | null = null;
    let chatColor = WHITE;
    if (v.clock.kind === 'behind') (chat = `CLOCK ${formatDrift(v.clock.behindMs).toUpperCase()} BEHIND`), (chatColor = GOLD);
    else if (v.clock.kind === 'unverified') (chat = `TAP IF ${hhmm(v.now)} IS RIGHT`), (chatColor = GOLD);
    else if (t - cheerAt.current < CHEER_MS) (chat = v.phase === 'focus' ? 'NEW DAY. PRESS TO DIG' : '+1 DIAMOND! CHEST OPENED'), (chatColor = rgb(120, 255, 140));
    else if (holdFrac > 0) chat = 'HOLD TO STOP DIGGING';
    else if (v.mode === 'paused') chat = 'GAME PAUSED - PRESS TO RESUME';
    if (chat) {
      f.dim(2, H - 32, width3(chat) + 4, 8, 0.35);
      text(f, chat, 4, H - 31, chatColor);
    }
    if (holdFrac > 0) f.dim(0, 0, W, H - 24, 1 - holdFrac * 0.5);
  };

  const fps = v.mode === 'running' || v.holding || performance.now() - debris.current.at < 800 ? 6 : 0;
  return (
    <div className={`mine-root mode-${v.mode}`} {...v.knob}>
      <Screen draw={draw} fps={fps}>
        <div
          className="hit hit-chat"
          onPointerDown={e => v.clock.kind === 'unverified' && e.stopPropagation()}
          onClick={v.clock.kind === 'unverified' ? v.trustClock : undefined}
        />
        <div className="hit hit-bar" onPointerDown={e => e.stopPropagation()} onClick={v.toggleHistory} />
      </Screen>
    </div>
  );
}
