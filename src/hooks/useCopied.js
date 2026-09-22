import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Shared "copied" flag with auto-reset for copy-to-clipboard UIs.
 *
 * Centralizes what every copy button needs: a boolean that flips true on a
 * successful copy and resets itself after `resetMs`, with the pending timer
 * cleared on unmount (no setState-after-unmount, no stacked timers on rapid
 * clicks). Pair it with `copyToClipboard()`:
 *
 *   const { copied, markCopied } = useCopied();
 *   const ok = await copyToClipboard(value, { success: null });
 *   if (ok) markCopied();
 *
 * @param {number} [resetMs=2000] - how long the copied flag stays true
 * @returns {{ copied: boolean, markCopied: () => void }}
 */
export const useCopied = (resetMs = 2000) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const markCopied = useCallback(() => {
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), resetMs);
  }, [resetMs]);

  return { copied, markCopied };
};
