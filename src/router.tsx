import { MutationCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { routeTree } from "./routeTree.gen";

/**
 * Per-mutation options for the app-wide feedback below, set via `meta`:
 *  - success: toast this message when the mutation succeeds.
 *  - inlineErrors: the screen shows its own error, so don't also toast it.
 */
declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: { success?: string; inlineErrors?: boolean };
  }
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    // Every action gets visible feedback: a failure is never silent, and
    // actions that change nothing on screen can confirm themselves.
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.meta?.inlineErrors || mutation.options.onError) return;
        toast.error(error instanceof Error ? error.message : "Something went wrong.");
      },
      onSuccess: (_data, _vars, _ctx, mutation) => {
        if (mutation.meta?.success) toast.success(mutation.meta.success);
      },
    }),
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
