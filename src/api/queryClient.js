import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

// Factory instead of a module-level singleton: tests that render <App/> get a
// fresh cache and can never leak query state into one another.
//
// Queries opt into a user-facing toast by setting `meta: { errorToast: "..." }`.
// This cache-level onError is the React Query v5 replacement for the per-query
// onError it removed, and it fires once per failed fetch — unlike a page
// useEffect on `isError`, which fired on every render while the query stayed
// errored.
export const createQueryClient = (queryOptions = {}) =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (_error, query) => {
        if (query.meta?.errorToast) toast.error(query.meta.errorToast);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 10,
        retry: 1,
        refetchOnWindowFocus: false,
        ...queryOptions,
      },
    },
  });
