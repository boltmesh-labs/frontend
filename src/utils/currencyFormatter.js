/**
 * Formats currency amounts based on the payment method or currency code.
 * @param {number|string} rawAmount - The decimal amount from the backend (e.g., 0.00010581 for BTC).
 * @param {string} currency - The method or currency code used (e.g., 'btc', 'xmr', 'usd').
 * @returns {string} Formatted currency string.
 */
export const formatCurrencyAmount = (rawAmount, currency) => {
  if (rawAmount === undefined || rawAmount === null || isNaN(Number(rawAmount))) return '0';
  if (!currency) return String(rawAmount);

  const num = Number(rawAmount);
  const currencyLower = String(currency).toLowerCase();

  switch (currencyLower) {
    case 'btc': {
      // Convert standard BTC decimal to Satoshis (1 BTC = 100,000,000 Sats)
      const sats = Math.round(num * 1e8);
      const formattedSats = sats.toLocaleString('en-US');

      // Keep up to 8 decimal places for BTC display, stripping trailing zeros
      const formattedBtc = Number(num.toFixed(8));

      return `${formattedSats} Sats (${formattedBtc} BTC)`;
    }

    case 'xmr':
      // Formats XMR with up to 6 decimal places, removing unnecessary trailing zeros
      return `${Number(num.toFixed(6))} XMR`;

    case 'eur':
      return `€${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    case 'gbp':
      return `£${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    case 'usd':
      return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    default:
      return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency.toUpperCase()}`;
  }
};
