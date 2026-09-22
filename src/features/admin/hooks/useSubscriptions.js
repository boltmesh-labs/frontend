import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/api/client';

import { adminKeys } from '../api/queryKeys';
import { createAdminResource, makeUseActionMutation } from './createAdminResource';

const resource = createAdminResource({
  resourcePath: '/admin/subscriptions',
  listKey: adminKeys.subscriptions,
  detailKey: adminKeys.subscriptionDetail,
});

export const useSubscriptions = resource.useList;
export const useSubscriptionDetail = resource.useDetail;

export const useSubscriptionDevices = (subscriptionId) =>
  useQuery({
    queryKey: adminKeys.subscriptionDevices(subscriptionId),
    queryFn: async () => {
      const { data } = await apiClient.api.get(
        `/admin/vpn-devices/by-subscription/${subscriptionId}`
      );
      return data;
    },
    enabled: Boolean(subscriptionId),
  });

export const useSubscriptionInvoices = (subscriptionId) =>
  useQuery({
    queryKey: adminKeys.subscriptionInvoices(subscriptionId),
    queryFn: async () => {
      const { data } = await apiClient.api.get(`/admin/invoices/by-subscription/${subscriptionId}`);
      return data;
    },
    enabled: Boolean(subscriptionId),
  });

// Deliberately invalidates only the subscriptions scope — the admin
// subscription detail page refetches on mount via staleTime handling.
export const useCancelSubscription = makeUseActionMutation({
  request: (id) => apiClient.api.post(`/admin/subscriptions/${id}/cancel`),
  successMessage: 'Subscription cancelled',
  errorFallback: 'Cancellation failed',
  invalidateKeys: () => [adminKeys.subscriptions()],
});
