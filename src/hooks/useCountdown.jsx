import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Counts down toward an ISO date string and fires `onExpire` once the
 * countdown reaches zero. The internal clock only ticks while a target is set.
 *
 * @param {string|null} targetIso - ISO timestamp, or null to disable
 * @param {Object} [options]
 * @param {number} [options.intervalMs=1000]
 * @param {Function} [options.onExpire]
 * @returns {{ remainingMs: number, expired: boolean }}
 */
export const useCountdown = (targetIso, { intervalMs = 1000, onExpire } = {}) => {
  const targetMs = useMemo(() => {
    if (!targetIso) return null;
    const ms = new Date(targetIso).getTime();
    return Number.isNaN(ms) ? null : ms;
  }, [targetIso]);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (targetMs == null) return;
    const id = setInterval(() => setNow(Date.now()), Math.max(0, intervalMs));
    return () => clearInterval(id);
  }, [targetMs, intervalMs]);

  const remainingMs = useMemo(
    () => (targetMs == null ? 0 : Math.max(0, targetMs - now)),
    [targetMs, now]
  );
  const expired = targetMs != null && now >= targetMs;

  // Fire onExpire only once per expiry transition. Without this guard, a caller
  // passing an unstable inline callback would re-fire on every render.
  const firedRef = useRef(false);
  useEffect(() => {
    if (expired) {
      if (!firedRef.current) {
        firedRef.current = true;
        onExpire?.();
      }
    } else {
      firedRef.current = false;
    }
  }, [expired, onExpire]);

  return { remainingMs, expired };
};
