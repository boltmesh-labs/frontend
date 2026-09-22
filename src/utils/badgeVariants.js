import { USER_ROLES } from '@/constants/roles';
import {
  INVOICE_STATUSES,
  PAYMENT_STATUSES,
  SUBSCRIPTION_STATUSES,
  VPN_SERVER_STATUSES,
} from '@/constants/statuses';

// Variant maps are keyed off the canonical literals in constants/statuses.js
// (and roles.js) so badge colors can never drift from the backend enums they
// mirror.
export const invoiceStatusVariant = {
  [INVOICE_STATUSES.paid]: 'success',
  [INVOICE_STATUSES.pending]: 'warning',
  [INVOICE_STATUSES.expired]: 'danger',
  [INVOICE_STATUSES.expired_partially_paid]: 'dark',
  [INVOICE_STATUSES.canceled]: 'secondary',
  [INVOICE_STATUSES.confirming]: 'warning',
  [INVOICE_STATUSES.partially_paid]: 'info',
  [INVOICE_STATUSES.failed]: 'danger',
  [INVOICE_STATUSES.refund_required]: 'dark',
};

export const paymentStatusVariant = {
  [PAYMENT_STATUSES.succeeded]: 'success',
  [PAYMENT_STATUSES.refunded]: 'info',
  [PAYMENT_STATUSES.processing]: 'warning',
  [PAYMENT_STATUSES.failed]: 'danger',
  [PAYMENT_STATUSES.refund_required]: 'dark',
};

export const subscriptionStatusVariant = {
  [SUBSCRIPTION_STATUSES.active]: 'success',
  [SUBSCRIPTION_STATUSES.expired]: 'danger',
  [SUBSCRIPTION_STATUSES.canceled]: 'secondary',
  [SUBSCRIPTION_STATUSES.pending]: 'warning',
  [SUBSCRIPTION_STATUSES.grace_period]: 'info',
  [SUBSCRIPTION_STATUSES.past_due]: 'warning',
  [SUBSCRIPTION_STATUSES.trialing]: 'info',
};

export const userRoleVariant = {
  [USER_ROLES.admin]: 'danger',
  [USER_ROLES.user]: 'secondary',
};

export const serverStatusVariant = {
  [VPN_SERVER_STATUSES.online]: 'success',
  [VPN_SERVER_STATUSES.maintenance]: 'warning',
  [VPN_SERVER_STATUSES.provisioning]: 'info',
  [VPN_SERVER_STATUSES.offline]: 'danger',
  [VPN_SERVER_STATUSES.decommissioned]: 'secondary',
  [VPN_SERVER_STATUSES.error]: 'dark',
};

export const getStatusVariant = (status = '', variantMap) => {
  return variantMap[status.toLowerCase()] || 'secondary';
};

/**
 * Shared className for every `<Badge>` in the app: uppercase, compact, and
 * dark text on the light warning/info backgrounds so contrast stays readable.
 * Kept here so StatusBadge, the user badges, and the device-state badge cannot
 * drift apart.
 */
export const badgeClassName = (variant) => {
  const needsDarkText = variant === 'warning' || variant === 'info';
  return `text-uppercase px-2 py-1 small${needsDarkText ? ' text-dark' : ''}`;
};
