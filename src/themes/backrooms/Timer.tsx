import { useRef } from 'react';
import { formatDrift, hhmm } from '../kit';
import type { TimerView } from '../types';
import { battery, BLACK, H, osd, REC_RED, renderView, textWidth, vhs, W, walk, type Frame } from './engine';
import Screen from './Screen';

const HOLD_MS = 700;
/** How long the noclip glitch lasts after a phase ends. */
const NOCLIP_MS = 1600;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const centred = (f: Frame, s: string, y: number, scale = 1) => osd(f, s, Math.round((W - textWidth(s, scale)) / 2), y, scale);

function stamp(now: number) {
  const d = new Date(now);
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')} ${d.getFullYear()}  ${hhmm(now)}`;
}

/**
 * Found footage from the backrooms. Focus wanders the yellow office rooms
 * under a REC light; a finished focus noclips into the calm poolrooms for
 * the break. The camcorder's OSD carries the countdown, the set (battery),
 * today's sessions (tape counter) and the date stamp, which blinks when
 * the Car Thing's clock can't be trusted, like an unset camcorder.
 */
export default function Timer(v: TimerView) {
  const holdStart = useRef<number | null>(null);
  const noclipAt = useRef(-Infinity);
  const lastFlash = useRef(v.flash);
  if (v.holding && holdStart.current === null) holdStart.current = performance.now();
  if (!v.holding) holdStart.current = null;
  if (v.flash !== lastFlash.current) {
    lastFlash.current = v.flash;
    noclipAt.current = performance.now();
  }

  const level = v.phase === 'focus' ? 'office' : 'pool';
  const running = v.mode === 'running';

  const draw = (f: Frame, t: number) => {
    const holdFrac = holdStart.current === null ? 0 : Math.min(1, (t - holdStart.current) / HOLD_MS);
    const sinceNoclip = t - noclipAt.current;
    const noclip = sinceNoclip < NOCLIP_MS ? 1 - sinceNoclip / NOCLIP_MS : 0;
    const cam = walk(v.mode === 'idle' ? 0 : v.progress);
    const look = running ? Math.sin(t / 4200) * 0.14 : 0;
    const bob = running ? Math.sin(t / 320) * 0.8 : 0;
    const flicker = level === 'office' && Math.floor(t / 90) % 23 === 0;
    renderView(f, level, cam.x, cam.y, cam.angle + look, bob, t, flicker);
    vhs(f, Math.max(noclip, holdFrac * 0.8, v.mode === 'paused' ? 0.18 : 0));
    // the first instant of a noclip is a dropout: tape goes black before the new level
    if (noclip > 0.82) f.fill(BLACK);

    // OSD, top left: tape state
    const blink = Math.floor(t / 500) % 2 === 0;
    if (running && v.phase === 'focus') {
      if (blink) {
        f.rect(8, 8, 5, 5, REC_RED);
        f.rect(9, 7, 3, 7, REC_RED);
        f.rect(7, 9, 7, 3, REC_RED);
      }
      osd(f, 'REC', 17, 7);
    } else if (running) osd(f, '> PLAY', 7, 7);
    else if (v.mode === 'paused') osd(f, '|| PAUSE', 7, 7);
    else osd(f, '# STOP', 7, 7);

    // top right: SP, the set as a battery, today's sessions as a tape counter
    osd(f, 'SP', W - 52, 7);
    battery(f, W - 36, 6, v.set, blink);
    const tape = `TAPE ${String(v.today.sessions).padStart(2, '0')}`;
    osd(f, tape, W - 7 - textWidth(tape), 19);

    // centre: what the knob does now, or what is happening
    if (noclip > 0) centred(f, 'NOCLIPPING...', 52, 2);
    else if (holdFrac > 0) centred(f, 'HOLD TO WAKE UP', 56);
    else if (v.mode === 'idle' && blink) centred(f, v.phase === 'focus' ? 'PRESS TO RECORD' : 'PRESS TO REST', 56);
    else if (v.mode === 'paused') centred(f, 'PRESS TO RESUME', 56);

    // the countdown, big
    centred(f, v.countdown, 90, 4);

    // clock trouble shows the way an unset camcorder does
    if (v.clock.kind === 'unverified') centred(f, `TAP IF ${hhmm(v.now)} IS RIGHT`, 32);
    if (v.clock.kind === 'behind') centred(f, `CLOCK ${formatDrift(v.clock.behindMs).toUpperCase()} BEHIND`, 32);
    const date = v.clock.kind !== 'ok' && blink ? '-- --- ----  --:--' : stamp(v.now);
    osd(f, date, 7, H - 13);
    const where = level === 'office' ? 'LEVEL 0' : 'LEVEL 37';
    osd(f, where, W - 7 - textWidth(where), H - 13);
  };

  const animating = running || v.holding || v.mode === 'paused' || performance.now() - noclipAt.current < NOCLIP_MS;
  return (
    <div className={`backrooms-root mode-${v.mode}`} {...v.knob}>
      <Screen draw={draw} animating={animating}>
        <div
          className="hit hit-clock"
          onPointerDown={e => v.clock.kind === 'unverified' && e.stopPropagation()}
          onClick={v.clock.kind === 'unverified' ? v.trustClock : undefined}
        />
        <div className="hit hit-tape" onPointerDown={e => e.stopPropagation()} onClick={v.toggleHistory} />
      </Screen>
    </div>
  );
}
