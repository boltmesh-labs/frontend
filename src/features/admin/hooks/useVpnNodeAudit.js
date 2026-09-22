import { adminKeys } from '../api/queryKeys';
import { createAdminResource } from './createAdminResource';

const resource = createAdminResource({
  resourcePath: '/admin/audit/node-registration-logs',
  listKey: adminKeys.vpnNodeAudit,
  detailKey: adminKeys.vpnNodeAudit,
  detailOptions: { requireRealId: true },
});

export const useVpnNodeAudit = resource.useList;
