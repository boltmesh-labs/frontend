import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/api/client';

import { adminKeys } from '../api/queryKeys';
import { createAdminResource, makeUseStatusToggle } from './createAdminResource';

const resource = createAdminResource({
  resourcePath: '/admin/users',
  listKey: adminKeys.users,
  detailKey: adminKeys.userDetail,
  detailOptions: {
    // User profiles live under /{id}/profile, not the bare id.
    pathSuffix: '/profile',
    requireRealId: true,
  },
});

export const useUsers = resource.useList;
export const useUserDetail = resource.useDetail;

// PATCH /{id}/status is a pure toggle (no body); is_active flips server-side
// while every cached users query flips optimistically.
export const useToggleUserStatus = makeUseStatusToggle({
  scopeKey: adminKeys.users,
  field: 'is_active',
  request: ({ id }) => apiClient.api.patch(`/admin/users/${id}/status`),
  successMessage: 'User status updated',
  errorFallback: 'Failed to update user status',
});

export const useUpdateUser = resource.makeUseUpdate({ successMessage: 'User updated' });

export const useUserDevices = (userId) =>
  useQuery({
    queryKey: adminKeys.userDevices(userId),
    queryFn: async () => {
      const { data } = await apiClient.api.get(`/admin/vpn-devices/by-user/${userId}`);
      return data;
    },
    enabled: Boolean(userId),
    placeholderData: (prev) => prev,
  });

export const useUserSubscriptions = (userId) =>
  useQuery({
    queryKey: adminKeys.userSubscriptions(userId),
    queryFn: async () => {
      const { data } = await apiClient.api.get(`/admin/subscriptions/by-user/${userId}`);
      return data;
    },
    enabled: Boolean(userId),
    placeholderData: (prev) => prev,
  });

export const useUserInvoices = (userId) =>
  useQuery({
    queryKey: adminKeys.userInvoices(userId),
    queryFn: async () => {
      const { data } = await apiClient.api.get(`/admin/invoices/by-user/${userId}`);
      return data;
    },
    enabled: Boolean(userId),
    placeholderData: (prev) => prev,
  });
