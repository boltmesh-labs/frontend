// Resolve the plan backing a user's device allowance. Prefers the
// backend-computed active subscription (UserDetailOut.active_subscription);
// falls back to a client-side lookup over the raw subscriptions array — which
// useUserSubscriptions normalizes to a bare array — to cover `trialing`
// subscriptions, which the computed field intentionally excludes.
export const resolveActivePlan = (profile, subscriptions) =>
  profile?.active_subscription?.plan ||
  subscriptions?.find?.((s) => ['active', 'trialing'].includes(s.status?.toLowerCase()))?.plan;
