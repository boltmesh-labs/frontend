import { apiClient } from '@/api/client';

import { adminKeys } from '../api/queryKeys';
import { createAdminResource, makeUseStatusToggle } from './createAdminResource';

const resource = createAdminResource({
  resourcePath: '/admin/vpn-devices',
  listKey: adminKeys.vpnDevices,
  detailKey: adminKeys.vpnDeviceDetail,
  detailOptions: { requireRealId: true },
});

export const useVpnDevices = resource.useList;
export const useVpnDeviceDetail = resource.useDetail;

// Backend toggles the stored state server-side; the status endpoint takes no
// body. Device create/delete live in the dashboard hooks (user-facing flows).
export const useToggleVpnDeviceStatus = makeUseStatusToggle({
  scopeKey: adminKeys.vpnDevices,
  field: 'is_active',
  request: ({ id }) => apiClient.api.patch(`/admin/vpn-devices/${id}/status`),
  successMessage: 'VPN Device status updated',
  errorFallback: 'Failed to update device status',
});
