import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import { apiClient } from '@/api/client';
import { getApiError } from '@/utils/errorHandler';

/**
 * Factory for the admin CRUD hook family (use*.js siblings).
 *
 * Every admin resource repeated the same scaffolding: a paginated list query,
 * a detail query guarded against sentinel ids, and create/update/delete
 * mutations that toast and invalidate the affected cache scopes. This module
 * owns that logic exactly once; each use*.js file declares only what genuinely
 * differs (paths, key factories, toast copy, wire-format oddities).
 *
 * Options exist solely to express observed backend differences:
 *   - listOptions.transform      plans normalize their envelope (extractList)
 *   - detailOptions.pathSuffix   users fetch `${id}/profile`
 *   - detailOptions.requireRealId  skip the '/new' pseudo-id
 *   - makeUseDelete.removeDetail   plans drop the cached detail on delete
 */

/**
 * Creates { useList, useDetail, makeUseCreate, makeUseUpdate, makeUseDelete }
 * for one admin resource.
 *
 * @param {Object} config
 * @param {string} config.resourcePath - Collection endpoint, e.g. '/admin/users'.
 * @param {Function} config.listKey - Key factory for lists (also the prefix
 *   scope covering detail queries, see api/queryKeys.js).
 * @param {Function} config.detailKey - Key factory for the detail query.
 */
export const createAdminResource = ({
  resourcePath,
  listKey,
  detailKey,
  listOptions = {},
  detailOptions = {},
}) => {
  const { transform = (data) => data } = listOptions;
  const { pathSuffix = '', requireRealId = false } = detailOptions;

  const useList = (params = {}) =>
    useQuery({
      queryKey: listKey(params),
      queryFn: async () => {
        const { data } = await apiClient.api.get(resourcePath, { params });
        return transform(data);
      },
      placeholderData: (prev) => prev,
    });

  const useDetail = (id) =>
    useQuery({
      queryKey: detailKey(id),
      queryFn: async () => {
        const { data } = await apiClient.api.get(`${resourcePath}/${id}${pathSuffix}`);
        return data;
      },
      // Prevent API requests for missing or sentinel ('/new') ids.
      enabled: requireRealId ? Boolean(id) && id !== 'new' : Boolean(id),
    });

  const makeUseCreate = ({ successMessage, invalidate = [listKey()] } = {}) =>
    function useCreate() {
      const queryClient = useQueryClient();

      return useMutation({
        mutationFn: async (payload) => {
          const { data } = await apiClient.api.post(resourcePath, payload);
          return data;
        },
        onSuccess: () => {
          toast.success(successMessage);
          invalidate.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
        },
        onError: (err) => toast.error(getApiError(err, 'Creation failed')),
      });
    };

  const makeUseUpdate = ({ successMessage } = {}) =>
    function useUpdate() {
      const queryClient = useQueryClient();

      return useMutation({
        mutationFn: async ({ id, ...updates }) => {
          const { data } = await apiClient.api.patch(`${resourcePath}/${id}`, updates);
          return data;
        },
        onSuccess: (data, { id }) => {
          toast.success(successMessage);
          queryClient.invalidateQueries({ queryKey: detailKey(id) });
          queryClient.invalidateQueries({ queryKey: listKey() });
        },
        onError: (err) => toast.error(getApiError(err, 'Update failed')),
      });
    };

  const makeUseDelete = ({ successMessage, removeDetail = false } = {}) =>
    function useDelete() {
      const queryClient = useQueryClient();

      return useMutation({
        mutationFn: async (id) => {
          await apiClient.api.delete(`${resourcePath}/${id}`);
          return id;
        },
        onSuccess: (_, id) => {
          toast.success(successMessage);
          if (removeDetail) {
            queryClient.removeQueries({ queryKey: detailKey(id) });
          }
          queryClient.invalidateQueries({ queryKey: listKey() });
        },
        onError: (err) => toast.error(getApiError(err, 'Deletion failed')),
      });
    };

  return { useList, useDetail, makeUseCreate, makeUseUpdate, makeUseDelete };
};

/**
 * Optimistic status-toggle generator shared by six resources.
 *
 * Cancels in-flight refetches for the scope, snapshots every cached list and
 * detail query, flips `field` optimistically, rolls back on error, and lets
 * each resource decide which scopes revalidate on settle.
 *
 * @param {Object} config
 * @param {Function} config.scopeKey - Prefix scope covering the resource
 *   (list + detail), e.g. adminKeys.plans().
 * @param {string} config.field - Cache field flipped optimistically.
 * @param {Function} [config.getNext] - Next value from the call variables;
 *   defaults to flipping `isActive`. Plans pass `({ enabled }) => !enabled`,
 *   servers receive the target state directly: `({ status }) => status`.
 * @param {Function} config.request - Wire format lives here on purpose:
 *   `({ id, next }) => promise` covers bare toggles (no body), body-carrying
 *   PATCHes, and query-param variants alike.
 * @param {string|Function} config.successMessage - String, or
 *   `({ result, variables }) => string` for dynamic copy.
 * @param {string} config.errorFallback - Fallback for the error toast.
 * @param {Function} [config.settleKeys] - Scopes invalidated on settle;
 *   defaults to the list scope. Plans add their detail key, servers widen to
 *   adminKeys.all because heartbeats touch other admin caches.
 * @param {boolean} [config.includeDetailObject] - Also patch a bare cached
 *   detail object (plans cache their detail without a `.data` envelope).
 */
export const makeUseStatusToggle = ({
  scopeKey,
  field,
  getNext = (variables) => !variables.isActive,
  request,
  successMessage,
  errorFallback,
  settleKeys,
  includeDetailObject = false,
}) =>
  function useStatusToggle() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (variables) => {
        const next = getNext(variables);
        await request({ ...variables, next });
        return { id: variables.id, [field]: next };
      },
      onMutate: async (variables) => {
        const next = getNext(variables);
        const { id } = variables;

        // Cancel outgoing refetches across all queries in this scope
        await queryClient.cancelQueries({ queryKey: scopeKey() });

        // Snapshot the cached scope (paginated lists + detail) for rollback
        const previousSnapshot = queryClient.getQueriesData({ queryKey: scopeKey() });

        // Optimistically apply the flip in every cached query of the scope
        queryClient.setQueriesData({ queryKey: scopeKey() }, (old) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return old.map((item) => (item.id === id ? { ...item, [field]: next } : item));
          }
          if (Array.isArray(old.data)) {
            return {
              ...old,
              data: old.data.map((item) => (item.id === id ? { ...item, [field]: next } : item)),
            };
          }
          if (includeDetailObject && old.id === id) {
            return { ...old, [field]: next };
          }
          return old;
        });

        return { previousSnapshot };
      },
      onError: (err, _variables, context) => {
        if (context?.previousSnapshot) {
          context.previousSnapshot.forEach(([queryKey, data]) => {
            queryClient.setQueryData(queryKey, data);
          });
        }
        toast.error(getApiError(err, errorFallback));
      },
      onSuccess: (result, variables) => {
        const message =
          typeof successMessage === 'function'
            ? successMessage({ result, variables })
            : successMessage;
        toast.success(message);
      },
      onSettled: (_data, _error, variables) => {
        const keys = settleKeys ? settleKeys(variables) : [scopeKey()];
        keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      },
    });
  };

/**
 * Single-id action mutation generator (cancel invoice / cancel subscription):
 * POST-like endpoints where the caller only cares about side effects and
 * which scopes to refresh afterwards. Resolves to the acted-on id.
 *
 * @param {Function} config.request - `(id) => promise`.
 * @param {string} config.successMessage
 * @param {string} config.errorFallback
 * @param {Function} config.invalidateKeys - `(id) => array of query keys`.
 */
export const makeUseActionMutation = ({ request, successMessage, errorFallback, invalidateKeys }) =>
  function useActionMutation() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (id) => {
        await request(id);
        return id;
      },
      onSuccess: (_, id) => {
        toast.success(successMessage);
        invalidateKeys(id).forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      },
      onError: (err) => toast.error(getApiError(err, errorFallback)),
    });
  };
