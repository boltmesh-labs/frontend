/**
 * Canonical status literals returned by the backend API (mirrors
 * backend/app/billing/enums.py, backend/app/subscriptions/enums.py, and
 * backend/app/vpn/enums.py).
 *
 * Centralizing them keeps predicate lists (terminal invoices, renewable
 * subscriptions, filter options) from drifting apart across pages — the same
 * class of magic strings GUARD_TYPES eliminated for route guards in App.jsx.
 * If the backend enum changes, update it here first.
 */

export const INVOICE_STATUSES = {
  pending: 'pending',
  paid: 'paid',
  confirming: 'confirming',
  expired: 'expired',
  partially_paid: 'partially_paid',
  expired_partially_paid: 'expired_partially_paid',
  canceled: 'canceled',
  failed: 'failed',
  refund_required: 'refund_required',
  refunded: 'refunded',
};

/**
 * Invoices the Payment page treats as settled/dead: polling stops and the user
 * is redirected back to the dashboard. The backend also defines `refunded`;
 * today the Payment page deliberately keeps polling refunded invoices, so it
 * is intentionally NOT part of this set.
 */
export const TERMINAL_INVOICE_STATUSES = [
  INVOICE_STATUSES.paid,
  INVOICE_STATUSES.expired,
  INVOICE_STATUSES.canceled,
  INVOICE_STATUSES.failed,
  INVOICE_STATUSES.expired_partially_paid,
  INVOICE_STATUSES.refund_required,
];

/** Invoice statuses whose expiry countdown can still cut the window short. */
export const ACTIONABLE_INVOICE_STATUSES = [
  INVOICE_STATUSES.pending,
  INVOICE_STATUSES.confirming,
  INVOICE_STATUSES.partially_paid,
];

export const SUBSCRIPTION_STATUSES = {
  active: 'active',
  expired: 'expired',
  canceled: 'canceled',
  pending: 'pending',
  grace_period: 'grace_period',
  past_due: 'past_due',
  trialing: 'trialing',
};

/** Subscriptions whose owner can extend/renew in place. */
export const RENEWABLE_SUBSCRIPTION_STATUSES = [
  SUBSCRIPTION_STATUSES.active,
  SUBSCRIPTION_STATUSES.grace_period,
  SUBSCRIPTION_STATUSES.trialing,
];

export const PAYMENT_STATUSES = {
  processing: 'processing',
  succeeded: 'succeeded',
  failed: 'failed',
  refunded: 'refunded',
  refund_required: 'refund_required',
};

/** Canonical VPN server operational states (mirrors backend/app/vpn/enums.py). */
export const VPN_SERVER_STATUSES = {
  online: 'online',
  provisioning: 'provisioning',
  maintenance: 'maintenance',
  offline: 'offline',
  decommissioned: 'decommissioned',
  error: 'error',
};

/**
 * Region enablement vocabulary shown in filters/badges. The backend stores a
 * boolean `is_active`; these are the UI strings VpnRegionList encodes into it
 * via its paramValue transform (there is no backend enum for this pair).
 */
export const VPN_REGION_STATES = {
  active: 'active',
  inactive: 'inactive',
};

export const NODE_REGISTRATION_STATUSES = {
  SUCCESS: 'SUCCESS',
  INVALID_SECRET: 'INVALID_SECRET',
  IID_VERIFICATION_FAILED: 'IID_VERIFICATION_FAILED',
  EXPIRED: 'EXPIRED',
  REGION_CONFLICT: 'REGION_CONFLICT',
  TUNNEL_ADDRESS_OVERLAP: 'TUNNEL_ADDRESS_OVERLAP',
  REGION_NOT_FOUND: 'REGION_NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

export const NODE_REGISTRATION_AUTH_METHODS = {
  AWS_IID: 'AWS_IID',
  BOOTSTRAP_SECRET: 'BOOTSTRAP_SECRET',
  FAILED: 'FAILED',
};
