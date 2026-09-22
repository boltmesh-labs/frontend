import { apiClient } from '@/api/client';
import { extractList } from '@/utils/apiResponse';

import { adminKeys } from '../api/queryKeys';
import { createAdminResource, makeUseStatusToggle } from './createAdminResource';

const resource = createAdminResource({
  resourcePath: '/admin/plans',
  listKey: adminKeys.plans,
  detailKey: adminKeys.planDetail,
  listOptions: { transform: extractList },
  detailOptions: { requireRealId: true },
});

export const usePlans = resource.useList;
export const usePlanDetail = resource.useDetail;
export const useCreatePlan = resource.makeUseCreate({
  successMessage: 'Plan created successfully',
});
export const useUpdatePlan = resource.makeUseUpdate({
  successMessage: 'Plan updated successfully',
});
export const useDeletePlan = resource.makeUseDelete({
  successMessage: 'Plan deleted successfully',
  removeDetail: true,
});

// PATCH /{id}/toggle accepts no body; enabled flips server-side while every
// cached plans query — lists and the bare detail object — flips optimistically.
export const useTogglePlanStatus = makeUseStatusToggle({
  scopeKey: adminKeys.plans,
  field: 'enabled',
  getNext: ({ enabled }) => !enabled,
  request: ({ id }) => apiClient.api.patch(`/admin/plans/${id}/toggle`),
  successMessage: ({ result }) => `Plan successfully ${result.enabled ? 'enabled' : 'disabled'}.`,
  errorFallback: 'Failed to update plan status',
  settleKeys: ({ id }) => [adminKeys.plans(), adminKeys.planDetail(id)],
  includeDetailObject: true,
});
