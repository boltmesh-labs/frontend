import { apiClient } from '@/api/client';

import { adminKeys } from '../api/queryKeys';
import { createAdminResource, makeUseActionMutation } from './createAdminResource';

const resource = createAdminResource({
  resourcePath: '/admin/invoices',
  listKey: adminKeys.invoices,
  detailKey: adminKeys.invoiceDetail,
});

export const useInvoices = resource.useList;
export const useInvoiceDetail = resource.useDetail;

export const useCancelInvoice = makeUseActionMutation({
  request: (id) => apiClient.api.post(`/admin/invoices/${id}/cancel`),
  successMessage: 'Invoice canceled',
  errorFallback: 'Cancellation failed',
  invalidateKeys: (id) => [adminKeys.invoiceDetail(id), adminKeys.invoices()],
});
