// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  INVOICE_COLUMNS,
  INVOICE_PAYMENTS_COLUMNS,
  PAYMENT_TABLE_COLUMNS,
  SUBSCRIPTION_INVOICE_COLUMNS,
  USER_INVOICE_COLUMNS,
  USER_SUBSCRIPTION_COLUMNS,
  VPN_DEVICE_COLUMNS,
} from './tableColumns';

describe('tableColumns constants', () => {
  const cases = [
    ['VPN_DEVICE_COLUMNS', VPN_DEVICE_COLUMNS, 5],
    ['INVOICE_COLUMNS', INVOICE_COLUMNS, 4],
    ['PAYMENT_TABLE_COLUMNS', PAYMENT_TABLE_COLUMNS, 4],
    ['USER_SUBSCRIPTION_COLUMNS', USER_SUBSCRIPTION_COLUMNS, 4],
    ['USER_INVOICE_COLUMNS', USER_INVOICE_COLUMNS, 5],
    ['SUBSCRIPTION_INVOICE_COLUMNS', SUBSCRIPTION_INVOICE_COLUMNS, 5],
    ['INVOICE_PAYMENTS_COLUMNS', INVOICE_PAYMENTS_COLUMNS, 5],
  ];

  it.each(cases)('%s exposes one header per column', (_name, columns, expected) => {
    expect(columns).toHaveLength(expected);
    columns.forEach((column) => {
      expect(typeof column.header).toBe('string');
      expect(column.header.length).toBeGreaterThan(0);
    });
  });
});
