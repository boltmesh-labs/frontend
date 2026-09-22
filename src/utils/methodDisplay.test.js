// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getMethodDisplay } from './methodDisplay';

describe('getMethodDisplay', () => {
  it('returns UNKNOWN for nullish values', () => {
    expect(getMethodDisplay(null)).toBe('UNKNOWN');
    expect(getMethodDisplay(undefined)).toBe('UNKNOWN');
  });

  it('maps known methods case-insensitively', () => {
    expect(getMethodDisplay('paypal')).toBe('💳 PayPal');
    expect(getMethodDisplay('Stripe')).toBe('💳 Stripe');
    expect(getMethodDisplay('CREDIT_CARD')).toBe('💳 Credit Card');
    expect(getMethodDisplay('monero')).toBe('ɱ Monero');
    expect(getMethodDisplay('lightning')).toBe('₿ Lightning');
  });

  it('uppercases unknown methods', () => {
    expect(getMethodDisplay('crypto')).toBe('CRYPTO');
  });
});
