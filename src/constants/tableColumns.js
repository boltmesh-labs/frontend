/**
 * Shared table column shapes.
 *
 * Convention: a page's own list-table headers live next to its row renderer as
 * a local `TABLE_COLUMNS`, while these shared arrays exist only for the
 * detail-page history tables reused across pages. Keep each label in sync with
 * the matching row renderer in the page that consumes it.
 */

export const VPN_DEVICE_COLUMNS = [
  { header: 'Device' },
  { header: 'Name' },
  { header: 'Platform' },
  { header: 'Status' },
  { header: 'Created At' },
];

export const INVOICE_COLUMNS = [
  { header: 'Invoice' },
  { header: 'Amount' },
  { header: 'Status' },
  { header: 'Date' },
];

export const PAYMENT_TABLE_COLUMNS = [
  { header: 'Transaction / Reference ID' },
  { header: 'Amount' },
  { header: 'Status' },
  { header: 'Date' },
];

// Admin detail-page shapes. These are declared here so identical header arrays
// are never redefined (and cannot drift) inside individual pages; keep each
// label in sync with the matching row renderer in the page that uses it.

/** User profile → subscription history (admin/UserDetail). */
export const USER_SUBSCRIPTION_COLUMNS = [
  { header: 'Subscription' },
  { header: 'Plan' },
  { header: 'Status' },
  { header: 'Expiration Date' },
];

/** User profile → invoice history (admin/UserDetail). */
export const USER_INVOICE_COLUMNS = [
  { header: 'Invoice' },
  { header: 'Plan' },
  { header: 'Method' },
  { header: 'Amount Paid' },
  { header: 'Status' },
];

/** Subscription detail → invoice history (admin/SubscriptionDetail). */
export const SUBSCRIPTION_INVOICE_COLUMNS = [
  { header: 'Invoice' },
  { header: 'Method' },
  { header: 'Amount Paid' },
  { header: 'Status' },
  { header: 'Created At' },
];

/** Invoice detail → payment line items (admin/InvoiceDetail). */
export const INVOICE_PAYMENTS_COLUMNS = [
  { header: 'Payment' },
  { header: 'Transaction / Reference ID' },
  { header: 'Amount' },
  { header: 'Status' },
  { header: 'Date' },
];
