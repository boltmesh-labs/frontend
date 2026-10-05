import { adminKeys } from "../api/queryKeys";
import { createAdminResource } from "./createAdminResource";

const resource = createAdminResource({
  resourcePath: "/admin/audit/server-registration-logs",
  listKey: adminKeys.vpnServerRegistrationAudit,
  detailKey: adminKeys.vpnServerRegistrationAudit,
  detailOptions: { requireRealId: true },
});

export const useVpnServerRegistrationAudit = resource.useList;
