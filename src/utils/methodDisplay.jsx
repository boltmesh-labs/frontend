export const getMethodDisplay = (payment_method) => {
  if (payment_method === undefined || payment_method === null) return 'UNKNOWN';
  const lowercaseMethod = payment_method.toLowerCase();

  if (lowercaseMethod === 'paypal') return '💳 PayPal';
  if (lowercaseMethod === 'stripe') return '💳 Stripe';
  if (lowercaseMethod === 'credit_card') return '💳 Credit Card';
  if (lowercaseMethod === 'monero') return 'ɱ Monero';
  if (lowercaseMethod === 'lightning') return '₿ Lightning';

  return payment_method.toUpperCase();
};
