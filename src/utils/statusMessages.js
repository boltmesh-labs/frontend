import { formatCurrencyAmount } from '@/utils/currencyFormatter';

const defaultStatus = () => ({ msg: '⏳ Waiting for payment...', variant: 'info' });

const messages = {
  paid: () => ({ msg: '✅ Payment confirmed! Redirecting...', variant: 'success' }),
  confirming: () => ({ msg: '🕒 Waiting for network confirmations...', variant: 'info' }),
  partially_paid: (diff, currency) => ({
    msg: `⚠️ Partially paid. Please send ${formatCurrencyAmount(diff, currency)} more.`,
    variant: 'warning',
  }),
  expired: () => ({ msg: '❌ Invoice expired. Redirecting...', variant: 'danger' }),
  canceled: () => ({ msg: '❌ Invoice canceled. Redirecting...', variant: 'danger' }),
  failed: () => ({ msg: '❌ Payment failed. Redirecting...', variant: 'danger' }),
  expired_partially_paid: () => ({
    msg: '⚠️ Invoice expired with a partial payment. Please contact support.',
    variant: 'warning',
  }),
  refund_required: () => ({
    msg: '⚠️ Your payment was received but the plan is no longer available. Please contact support for a refund.',
    variant: 'warning',
  }),
};

/**
 * Resolves an invoice payment status into a `{ msg, variant }` banner.
 * @param {string|undefined} status - lowercase status
 * @param {number} [diff] - amount still owed (for partially_paid)
 * @param {string} [currency]
 */
export const invoiceStatusMessage = (status, diff = 0, currency) => {
  const builder = status ? messages[status.toLowerCase()] : undefined;
  return builder ? builder(diff, currency) : defaultStatus();
};
