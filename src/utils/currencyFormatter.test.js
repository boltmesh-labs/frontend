// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { formatCurrencyAmount } from './currencyFormatter';

describe('formatCurrencyAmount', () => {
  it('returns "0" for nullish or non-numeric input', () => {
    expect(formatCurrencyAmount(null, 'usd')).toBe('0');
    expect(formatCurrencyAmount(undefined, 'usd')).toBe('0');
    expect(formatCurrencyAmount('not-a-number', 'usd')).toBe('0');
  });

  it('returns the raw string when no currency is provided', () => {
    expect(formatCurrencyAmount(12.5)).toBe('12.5');
    expect(formatCurrencyAmount('7')).toBe('7');
  });

  it('formats BTC as sats plus BTC value', () => {
    expect(formatCurrencyAmount(0.00010581, 'btc')).toBe('10,581 Sats (0.00010581 BTC)');
  });

  it('handles uppercase BTC currency codes', () => {
    expect(formatCurrencyAmount(0.000001, 'BTC')).toBe('100 Sats (0.000001 BTC)');
  });

  it('formats XMR with up to 6 decimal places', () => {
    expect(formatCurrencyAmount(0.12345678, 'xmr')).toBe('0.123457 XMR');
  });

  it('formats EUR with two decimals', () => {
    expect(formatCurrencyAmount(12.5, 'eur')).toBe('€12.50');
  });

  it('formats GBP with two decimals', () => {
    expect(formatCurrencyAmount(12.5, 'gbp')).toBe('£12.50');
    expect(formatCurrencyAmount('9.9', 'GBP')).toBe('£9.90');
  });

  it('formats USD with two decimals', () => {
    expect(formatCurrencyAmount(12.5, 'usd')).toBe('$12.50');
    expect(formatCurrencyAmount(1000, 'usd')).toBe('$1,000.00');
  });

  it('formats unknown currencies with code suffix', () => {
    expect(formatCurrencyAmount(9.9, 'jpy')).toBe('9.90 JPY');
  });

  it('rounds negative zero to zero', () => {
    expect(formatCurrencyAmount(0.0000000001, 'btc')).toBe('0 Sats (0 BTC)');
  });
});
