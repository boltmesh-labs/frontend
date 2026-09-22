import { apiClient } from '@/api/client';

import { adminKeys } from '../api/queryKeys';
import { createAdminResource, makeUseStatusToggle } from './createAdminResource';

const resource = createAdminResource({
  resourcePath: '/admin/vpn-servers',
  listKey: adminKeys.vpnServers,
  detailKey: adminKeys.vpnServerDetail,
  // The create flow lives at /admin/vpn-servers/new; requireRealId keeps the
  // sentinel id from firing GET /admin/vpn-servers/new, which the backend's
  // UUID-typed detail path rejects with a 422 validation error.
  detailOptions: { requireRealId: true },
});

export const useVpnServers = resource.useList;
export const useVpnServerDetail = resource.useDetail;
export const useCreateVpnServer = resource.makeUseCreate({
  successMessage: 'VPN Server created',
});
export const useUpdateVpnServer = resource.makeUseUpdate({
  successMessage: 'VPN Server updated',
});
export const useDeleteVpnServer = resource.makeUseDelete({
  successMessage: 'VPN Server deleted',
  removeDetail: true,
});

// The toggle rides the regular PATCH /{id} endpoint with a { status } body;
// callers pass the target state (the row computes maintenance <-> online).
// Settling refreshes the whole admin scope: heartbeat-driven server state
// changes also surface in region/device views.
export const useToggleVpnServerStatus = makeUseStatusToggle({
  scopeKey: adminKeys.vpnServers,
  field: 'status',
  getNext: ({ status }) => status,
  request: ({ id, next }) => apiClient.api.patch(`/admin/vpn-servers/${id}`, { status: next }),
  successMessage: ({ variables }) => `Server status updated to ${variables.status}.`,
  errorFallback: 'Failed to update server status',
  settleKeys: () => [adminKeys.all],
});
