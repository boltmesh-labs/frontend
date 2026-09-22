import { adminKeys } from '../api/queryKeys';
import { createAdminResource } from './createAdminResource';

// Payments are read-only for admins: list + detail, no mutations.
const resource = createAdminResource({
  resourcePath: '/admin/payments',
  listKey: adminKeys.payments,
  detailKey: adminKeys.paymentDetail,
});

export const usePayments = resource.useList;
export const usePaymentDetail = resource.useDetail;
