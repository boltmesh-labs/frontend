import { apiClient } from '@/api/client';

import { adminKeys } from '../api/queryKeys';
import { createAdminResource, makeUseStatusToggle } from './createAdminResource';

const resource = createAdminResource({
  resourcePath: '/admin/vpn-regions',
  listKey: adminKeys.vpnRegions,
  detailKey: adminKeys.vpnRegionDetail,
  detailOptions: { requireRealId: true },
});

export const useVpnRegions = resource.useList;
export const useVpnRegionDetail = resource.useDetail;
export const useCreateVpnRegion = resource.makeUseCreate({
  successMessage: 'VPN Region created',
});
export const useUpdateVpnRegion = resource.makeUseUpdate({
  successMessage: 'VPN Region updated',
});
export const useDeleteVpnRegion = resource.makeUseDelete({
  successMessage: 'VPN Region deleted',
  removeDetail: true,
});

// Regions toggle through the regular PATCH /{id} endpoint with an explicit
// { is_active } body instead of a dedicated status route.
export const useToggleVpnRegionStatus = makeUseStatusToggle({
  scopeKey: adminKeys.vpnRegions,
  field: 'is_active',
  request: ({ id, next }) => apiClient.api.patch(`/admin/vpn-regions/${id}`, { is_active: next }),
  successMessage: 'VPN Region status updated',
  errorFallback: 'Failed to update region status',
});
