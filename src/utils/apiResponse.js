/**
 * Normalizes list API responses into a plain array.
 *
 * List endpoints inconsistently return either a bare array or an envelope
 * like `{ data: [...] }`, so every list queryFn funnels its payload through
 * this helper before it enters the react-query cache — consumers can rely on
 * always receiving an array.
 */
export const extractList = (payload) => {
  if (Array.isArray(payload)) return payload;
  return payload?.data ?? [];
};
