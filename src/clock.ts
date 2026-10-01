/**
 * Is the device clock believable?
 *
 * The Car Thing has no battery-backed RTC. A systemd guard saves the time
 * every five minutes and restores it at boot, so after any power-off the
 * clock resumes from where it stopped: it is behind by however long the
 * device was off, and nothing on the device can tell how long that was.
 *
 * Evidence, strongest first:
 *  - the phone's wall clock (time surface) — authoritative when present;
 *  - a logged session ending in the "future" — the clock went backwards;
 *  - the boot id — a clock confirmed on this boot stays good until the next.
 */

export type ClockStatus =
  | { kind: 'ok' }
  /** Rebooted since the clock was last confirmed; no way to check it. */
  | { kind: 'unverified' }
  /** Known to be behind by `behindMs`. */
  | { kind: 'behind'; behindMs: number };

/** Differences under this are ordinary drift, not a broken clock. */
export const TOLERANCE_MS = 2 * 60_000;

export interface ClockEvidence {
  /** Device clock minus phone clock at the moment the phone's time arrived. */
  phoneDriftMs: number | null;
  /** End of the newest logged session. */
  lastLoggedEnd: number | null;
  now: number;
  bootId: string | null;
  trustedBootId: string | null;
}

export function assessClock(e: ClockEvidence): ClockStatus {
  if (e.phoneDriftMs !== null) {
    // Only a device clock *behind* the phone is trusted as a fault. A device
    // far ahead most likely means the phone snapshot is a stale cache.
    if (e.phoneDriftMs < -TOLERANCE_MS) return { kind: 'behind', behindMs: -e.phoneDriftMs };
    if (Math.abs(e.phoneDriftMs) <= TOLERANCE_MS) return { kind: 'ok' };
  }
  if (e.lastLoggedEnd !== null && e.lastLoggedEnd - e.now > TOLERANCE_MS) {
    return { kind: 'behind', behindMs: e.lastLoggedEnd - e.now };
  }
  // Unknown boot id (daemon unreachable) is not evidence of anything.
  if (e.bootId === null || e.bootId === e.trustedBootId) return { kind: 'ok' };
  return { kind: 'unverified' };
}

/** "21 days", "3 h 20 min", "7 min". */
export function formatDrift(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return min % 60 ? `${h} h ${min % 60} min` : `${h} h`;
  return `${Math.round(h / 24)} days`;
}
