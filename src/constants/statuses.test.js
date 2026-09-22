// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  ACTIONABLE_INVOICE_STATUSES,
  INVOICE_STATUSES,
  PAYMENT_STATUSES,
  RENEWABLE_SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_STATUSES,
  TERMINAL_INVOICE_STATUSES,
  VPN_REGION_STATES,
  VPN_SERVER_STATUSES,
} from './statuses';

describe('status constants', () => {
  it('maps every invoice status key to its own literal', () => {
    Object.entries(INVOICE_STATUSES).forEach(([key, value]) => {
      expect(value).toBe(key);
    });
  });

  it('keeps refunded invoices out of the terminal set polled by the Payment page', () => {
    expect(TERMINAL_INVOICE_STATUSES).toEqual(
      expect.arrayContaining([
        INVOICE_STATUSES.paid,
        INVOICE_STATUSES.expired,
        INVOICE_STATUSES.canceled,
        INVOICE_STATUSES.failed,
        INVOICE_STATUSES.expired_partially_paid,
        INVOICE_STATUSES.refund_required,
      ])
    );
    expect(TERMINAL_INVOICE_STATUSES).not.toContain(INVOICE_STATUSES.refunded);
    expect(TERMINAL_INVOICE_STATUSES).not.toContain(INVOICE_STATUSES.pending);
  });

  it('treats pending-family invoices as actionable for the expiry countdown', () => {
    expect(ACTIONABLE_INVOICE_STATUSES).toEqual([
      INVOICE_STATUSES.pending,
      INVOICE_STATUSES.confirming,
      INVOICE_STATUSES.partially_paid,
    ]);
  });

  it('keeps actionable and terminal invoice sets disjoint', () => {
    ACTIONABLE_INVOICE_STATUSES.forEach((status) => {
      expect(TERMINAL_INVOICE_STATUSES).not.toContain(status);
    });
  });

  it('marks active-family subscriptions as renewable', () => {
    expect(RENEWABLE_SUBSCRIPTION_STATUSES).toEqual([
      SUBSCRIPTION_STATUSES.active,
      SUBSCRIPTION_STATUSES.grace_period,
      SUBSCRIPTION_STATUSES.trialing,
    ]);
  });

  it('exposes payment, vpn server, and region vocabularies as key-mirrored literals', () => {
    [PAYMENT_STATUSES, SUBSCRIPTION_STATUSES, VPN_SERVER_STATUSES, VPN_REGION_STATES].forEach(
      (group) => {
        Object.entries(group).forEach(([key, value]) => {
          expect(value).toBe(key);
        });
      }
    );
  });
});
