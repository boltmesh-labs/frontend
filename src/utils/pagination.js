/**
 * Derives pagination totals from a list-query response envelope.
 *
 * List endpoints expose the server-side row count as `total_count`; when a
 * response omits it, fall back to the length of the current page so the
 * pagination controls still render sensibly instead of collapsing to zero.
 *
 * @param {*} data - the list query result; may be an envelope `{ data, total_count }`
 * @param {number} pageSize
 * @returns {{ totalCount: number, totalPages: number }}
 */
export const getPaginationTotals = (data, pageSize) => {
  const totalCount = data?.total_count ?? data?.data?.length ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  return { totalCount, totalPages };
};
