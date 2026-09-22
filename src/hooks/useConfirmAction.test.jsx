import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { confirmMock } = vi.hoisted(() => ({ confirmMock: vi.fn() }));

vi.mock('@/hooks/useConfirm', () => ({
  useConfirm: () => ({ confirm: confirmMock, confirmDialog: null }),
}));

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/utils/errorHandler', () => ({
  handleApiError: vi.fn(),
}));

import { handleApiError } from '@/utils/errorHandler';
import { toast } from 'react-toastify';
import { useConfirmAction } from './useConfirmAction';

describe('useConfirmAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs the action after confirmation, toasts the result, and returns it', async () => {
    confirmMock.mockResolvedValue(true);
    const run = vi.fn().mockResolvedValue('payload');
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useConfirmAction());

    let promise;
    await act(async () => {
      promise = result.current.runConfirmed('k', { run, successMessage: 'done', onSuccess });
    });

    expect(run).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith('done');
    expect(onSuccess).toHaveBeenCalledWith('payload');
    await expect(promise).resolves.toBe('payload');
    expect(result.current.busy).toBeNull();
  });

  it('exposes the busy key while the action is in flight', async () => {
    confirmMock.mockResolvedValue(true);
    let resolveRun;
    const run = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveRun = resolve;
        })
    );
    const { result } = renderHook(() => useConfirmAction());

    let promise;
    act(() => {
      promise = result.current.runConfirmed('row-7', { run });
    });

    // Let the confirmed dialog's resolution settle so setBusy('row-7') lands;
    // the action's own promise stays pending until we resolve it below.
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.busy).toBe('row-7');

    await act(async () => {
      resolveRun();
      await promise;
    });

    expect(result.current.busy).toBeNull();
  });

  it('does nothing when the dialog is declined', async () => {
    confirmMock.mockResolvedValue(false);
    const run = vi.fn().mockResolvedValue('payload');
    const { result } = renderHook(() => useConfirmAction());

    let promise;
    await act(async () => {
      promise = result.current.runConfirmed('k', { run, successMessage: 'done' });
    });

    expect(run).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    await expect(promise).resolves.toBeUndefined();
    expect(result.current.busy).toBeNull();
  });

  it('routes failures through handleApiError + onError without a success toast', async () => {
    confirmMock.mockResolvedValue(true);
    const failure = new Error('boom');
    const run = vi.fn().mockRejectedValue(failure);
    const onError = vi.fn();
    const { result } = renderHook(() => useConfirmAction());

    let promise;
    await act(async () => {
      promise = result.current.runConfirmed('k', { run, successMessage: 'done', onError });
    });

    expect(handleApiError).toHaveBeenCalledWith(failure);
    expect(onError).toHaveBeenCalledWith(failure);
    expect(toast.success).not.toHaveBeenCalled();
    await expect(promise).resolves.toBeUndefined();
    expect(result.current.busy).toBeNull();
  });

  it('resolves confirm copy per call with fallbacks', async () => {
    confirmMock.mockResolvedValue(true);
    const run = vi.fn().mockResolvedValue();
    const { result } = renderHook(() => useConfirmAction({ title: 'Mounted Title' }));

    await act(async () => {
      result.current.runConfirmed('k', { run, message: 'Per-call message' });
    });

    expect(confirmMock).toHaveBeenCalledWith({
      title: 'Mounted Title',
      message: 'Per-call message',
      confirmText: 'Confirm',
      confirmVariant: 'danger',
    });
  });
});
