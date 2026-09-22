import { adminKeys } from '../api/queryKeys';
import { createAdminResource } from './createAdminResource';

const resource = createAdminResource({
  resourcePath: '/admin/vpn-peers',
  listKey: adminKeys.vpnPeers,
  detailKey: adminKeys.vpnPeerDetail,
  detailOptions: { requireRealId: true },
});

export const useVpnPeerDetail = resource.useDetail;
