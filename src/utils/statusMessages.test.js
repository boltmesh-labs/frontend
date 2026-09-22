// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { invoiceStatusMessage } from './statusMessages';

describe('invoiceStatusMessage', () => {
  it('defaults to a waiting message for unknown or missing statuses', () => {
    expect(invoiceStatusMessage(undefined)).toEqual({
      msg: '⏳ Waiting for payment...',
      variant: 'info',
    });
    expect(invoiceStatusMessage('weird')).toEqual({
      msg: '⏳ Waiting for payment...',
      variant: 'info',
    });
  });

  it('maps a paid status', () => {
    expect(invoiceStatusMessage('paid')).toEqual({
      msg: '✅ Payment confirmed! Redirecting...',
      variant: 'success',
    });
  });

  it('maps a confirming status', () => {
    expect(invoiceStatusMessage('CONFIRMING')).toEqual({
      msg: '🕒 Waiting for network confirmations...',
      variant: 'info',
    });
  });

  it('maps a partially paid status with the shortfall formatted in the currency', () => {
    const result = invoiceStatusMessage('partially_paid', 150, 'usd');
    expect(result.variant).toBe('warning');
    expect(result.msg).toContain('$150.00');
    expect(result.msg).toContain('more');
  });

  it('maps expired and canceled statuses', () => {
    expect(invoiceStatusMessage('expired').variant).toBe('danger');
    expect(invoiceStatusMessage('canceled').variant).toBe('danger');
  });

  it('maps a refund_required status', () => {
    const result = invoiceStatusMessage('refund_required');
    expect(result.variant).toBe('warning');
    expect(result.msg).toContain('refund');
  });
});
