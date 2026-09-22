import { useMemo } from 'react';

/**
 * Memoized id → plan lookup for pages that join list rows to their plan name
 * from a separately fetched plans array. Rebuilding the Map only when `plans`
 * changes keeps row renderers stable across pagination/filter re-renders.
 *
 * @param {Array|undefined} plans - normalized plans array (not an envelope)
 * @returns {Map<string, object>}
 */
export const usePlanMap = (plans) =>
  useMemo(() => (plans ? new Map(plans.map((plan) => [plan.id, plan])) : new Map()), [plans]);
