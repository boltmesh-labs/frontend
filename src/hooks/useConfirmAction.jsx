import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { useConfirm } from '@/hooks/useConfirm';
import { handleApiError } from '@/utils/errorHandler';

/**
 * Runs a destructive/confirmation-wrapped action: prompts with a confirm
 * dialog, guards against double-submission via a `busy` flag, runs an async
 * `run` function, and surfaces the result through toasts / `handleApiError`.
 *
 * Confirm copy can be provided either at mount (shared defaults) or per call:
 *   const { runConfirmed, busy, confirmDialog } = useConfirmAction({ title: '…' });
 *   await runConfirmed(id, { confirmation, run, successMessage, onSuccess });
 *
 * @returns {{ runConfirmed: (key, opts) => Promise, busy: string|true|null, confirmDialog }}
 */
export const useConfirmAction = (config = {}) => {
  const { confirm, confirmDialog } = useConfirm();
  const [busy, setBusy] = useState(null);

  const runConfirmed = useCallback(
    async (key, opts = {}) => {
      const title = opts.title ?? opts.confirmation?.title ?? config.title;
      const isConfirmed = await confirm({
        title: title || 'Confirm Action',
        message: opts.message ?? opts.confirmation?.message ?? config.message ?? 'Are you sure?',
        confirmText:
          opts.confirmText ?? opts.confirmation?.confirmText ?? config.confirmText ?? 'Confirm',
        confirmVariant:
          opts.confirmVariant ??
          opts.confirmation?.confirmVariant ??
          config.confirmVariant ??
          'danger',
      });
      if (!isConfirmed) return;

      setBusy(key ?? true);
      try {
        const result = await opts.run();
        const message =
          typeof opts.successMessage === 'function'
            ? opts.successMessage(result)
            : (opts.successMessage ?? config.successMessage);
        if (message) toast.success(message);
        opts.onSuccess?.(result);
        return result;
      } catch (err) {
        handleApiError(err);
        opts.onError?.(err);
      } finally {
        setBusy(null);
      }
    },
    [confirm, config]
  );

  return { runConfirmed, busy, confirmDialog };
};
