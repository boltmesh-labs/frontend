// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { resolveActivePlan } from './activePlan';

const proPlan = { id: 'pro', name: 'Pro', max_devices: 5 };
const trialPlan = { id: 'trial', name: 'Trial', max_devices: 3 };

const trialingSubscription = { id: 's1', status: 'trialing', plan: trialPlan };
const canceledSubscription = {
  id: 's2',
  status: 'canceled',
  plan: { id: 'old', name: 'Old', max_devices: 9 },
};

describe('resolveActivePlan', () => {
  it('prefers the backend-computed active_subscription from the profile', () => {
    const profile = { active_subscription: { plan: proPlan } };
    expect(resolveActivePlan(profile, [trialingSubscription])).toEqual(proPlan);
  });

  // Regression guard for the response-shape contract: useUserSubscriptions
  // normalizes the payload to a bare array, so the fallback must read the
  // array directly (an envelope-style `.data` lookup silently never ran and
  // the trialing fallback was dead code).
  it('falls back to a trialing subscription in the bare-array shape', () => {
    expect(resolveActivePlan({}, [canceledSubscription, trialingSubscription])).toEqual(trialPlan);
  });

  it('ignores subscriptions that are neither active nor trialing', () => {
    expect(resolveActivePlan({}, [canceledSubscription])).toBeUndefined();
  });

  it('tolerates missing profile and subscription data', () => {
    expect(resolveActivePlan(null, null)).toBeUndefined();
    expect(resolveActivePlan(undefined, [])).toBeUndefined();
  });
});
