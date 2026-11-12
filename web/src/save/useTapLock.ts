import { useCallback, useEffect, useRef } from "react";

export const TAP_LOCK_MS = 600;

/**
 * Ignores taps for a moment after the screen moved on to `step`. An operator who double-taps
 * Done means the part in front of them; without this the second tap would confirm the next one.
 * Returns a function that says whether a tap right now should be ignored.
 */
export function useTapLock(step: string | number): () => boolean {
  const lockedUntil = useRef(0);
  const shownStep = useRef(step);

  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    lockedUntil.current = Date.now() + TAP_LOCK_MS;
  }, [step]);

  return useCallback(() => Date.now() < lockedUntil.current, []);
}
