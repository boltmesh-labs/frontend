import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/api/client';
import { toast } from 'react-toastify';
import {
  useCancelInvoice,
  useCancelUserSubscription,
  useChangePassword,
  useCreateInvoice,
  useCryptoPrices,
  useDeleteDevice,
  useFxRate,
  useInvoiceStatus,
  usePlanDetail,
  usePublicPlans,
  useRequestAccountDeletion,
  useResendActivation,
  useSupportedCurrencies,
  useUpdateProfile,
  useUserDevicesBySubscription,
  useUserInvoiceDetail,
  useUserInvoices,
  useUserInvoicesBySubscription,
  useUserSubscriptionDetail,
  useUserSubscriptions,
  useDashboardProfile,
} from './useDashboard';

vi.mock('@/api/client', () => ({
  apiClient: {
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useDashboard hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the dashboard profile from /users', async () => {
    apiClient.api.get.mockResolvedValue({ data: { username: 'amy' } });
    const { result } = renderHook(() => useDashboardProfile(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ username: 'amy' });
    expect(apiClient.api.get).toHaveBeenCalledWith('/users');
  });

  it('loads subscriptions as a bare array from envelope or raw payloads', async () => {
    apiClient.api.get.mockResolvedValue({ data: { data: [{ id: 's1' }] } });
    const { result } = renderHook(() => useUserSubscriptions(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 's1' }]);
    expect(apiClient.api.get).toHaveBeenCalledWith('/subscriptions');
  });

  it('loads a subscription detail and stays disabled for missing or "new" ids', async () => {
    apiClient.api.get.mockResolvedValue({ data: { id: 's1' } });
    const { result } = renderHook(() => useUserSubscriptionDetail('s1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.api.get).toHaveBeenCalledWith('/subscriptions/s1');

    vi.clearAllMocks();
    const disabled = renderHook(() => useUserSubscriptionDetail('new'), { wrapper });
    expect(disabled.result.current.fetchStatus).toBe('idle');
    expect(apiClient.api.get).not.toHaveBeenCalled();
  });

  it('loads a public plan detail and stays disabled without an id', async () => {
    apiClient.api.get.mockResolvedValue({ data: { id: 'p1' } });
    const { result } = renderHook(() => usePlanDetail('p1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.api.get).toHaveBeenCalledWith('/plans/p1');

    vi.clearAllMocks();
    const disabled = renderHook(() => usePlanDetail(undefined), { wrapper });
    expect(disabled.result.current.fetchStatus).toBe('idle');
    expect(apiClient.api.get).not.toHaveBeenCalled();
  });

  it('lists user invoices with pagination params', async () => {
    apiClient.api.get.mockResolvedValue({ data: { data: [], total_count: 0 } });
    const params = { skip: 0, limit: 10 };
    const { result } = renderHook(() => useUserInvoices(params), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.api.get).toHaveBeenCalledWith('/invoices', { params });
  });

  it('loads a user invoice detail and stays disabled without an id', async () => {
    apiClient.api.get.mockResolvedValue({ data: { id: 'inv1' } });
    const { result } = renderHook(() => useUserInvoiceDetail('inv1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.api.get).toHaveBeenCalledWith('/invoices/inv1');

    vi.clearAllMocks();
    const disabled = renderHook(() => useUserInvoiceDetail(undefined), { wrapper });
    expect(disabled.result.current.fetchStatus).toBe('idle');
    expect(apiClient.api.get).not.toHaveBeenCalled();
  });

  it('creates an invoice via POST /invoices', async () => {
    apiClient.api.post.mockResolvedValue({ data: { id: 'inv9' } });
    const { result } = renderHook(() => useCreateInvoice(), { wrapper });

    const payload = { plan_id: 'p1', payment_method: 'lightning', fiat_currency: 'USD' };
    await result.current.mutateAsync(payload);

    await waitFor(() => expect(apiClient.api.post).toHaveBeenCalledWith('/invoices', payload));
  });

  it('loads invoices and devices scoped to a subscription', async () => {
    apiClient.api.get.mockResolvedValue({ data: [{ id: 'inv1' }] });
    const invoices = renderHook(() => useUserInvoicesBySubscription('s1'), { wrapper });
    await waitFor(() => expect(invoices.result.current.isSuccess).toBe(true));
    expect(apiClient.api.get).toHaveBeenCalledWith('/invoices/by-subscription/s1');
    expect(invoices.result.current.data).toEqual([{ id: 'inv1' }]);

    apiClient.api.get.mockResolvedValue({ data: { data: [{ id: 'd1' }] } });
    const devices = renderHook(() => useUserDevicesBySubscription('s1'), { wrapper });
    await waitFor(() => expect(devices.result.current.isSuccess).toBe(true));
    expect(apiClient.api.get).toHaveBeenCalledWith('/vpn-devices/by-subscription/s1');
    expect(devices.result.current.data).toEqual([{ id: 'd1' }]);
  });

  it('stays disabled for subscription-scoped queries without an id', () => {
    const invoices = renderHook(() => useUserInvoicesBySubscription(undefined), { wrapper });
    const devices = renderHook(() => useUserDevicesBySubscription(undefined), { wrapper });

    expect(invoices.result.current.fetchStatus).toBe('idle');
    expect(devices.result.current.fetchStatus).toBe('idle');
    expect(apiClient.api.get).not.toHaveBeenCalled();
  });

  it('toasts on resend-activation success and failure', async () => {
    apiClient.api.post.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useResendActivation(), { wrapper });
    await result.current.mutateAsync();
    await waitFor(() => expect(apiClient.api.post).toHaveBeenCalledWith('/auth/resend-activation'));
    expect(toast.success).toHaveBeenCalledWith('Verification email sent.');

    apiClient.api.post.mockRejectedValue({ response: { data: { detail: 'Rate limited' } } });
    const { result: failing } = renderHook(() => useResendActivation(), { wrapper });
    await expect(failing.current.mutateAsync()).rejects.toBeDefined();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Rate limited'));
  });

  it('toasts on change-password success and failure', async () => {
    apiClient.api.put.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useChangePassword(), { wrapper });
    await result.current.mutateAsync({ current_password: 'a', new_password: 'b' });
    await waitFor(() =>
      expect(apiClient.api.put).toHaveBeenCalledWith('/users/change-password', {
        current_password: 'a',
        new_password: 'b',
      })
    );
    expect(toast.success).toHaveBeenCalledWith('Password updated successfully.');

    apiClient.api.put.mockRejectedValue({ response: { data: { detail: 'Weak password' } } });
    const { result: failing } = renderHook(() => useChangePassword(), { wrapper });
    await expect(
      failing.current.mutateAsync({ current_password: 'a', new_password: 'b' })
    ).rejects.toBeDefined();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Weak password'));
  });

  it('updates the profile and toasts the outcome', async () => {
    apiClient.api.patch.mockResolvedValue({ data: { username: 'amy' } });
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });
    await result.current.mutateAsync({ username: 'amy' });
    await waitFor(() =>
      expect(apiClient.api.patch).toHaveBeenCalledWith('/users', { username: 'amy' })
    );
    expect(toast.success).toHaveBeenCalledWith('Profile updated successfully.');

    apiClient.api.patch.mockRejectedValue({ response: { data: { detail: 'Taken' } } });
    const { result: failing } = renderHook(() => useUpdateProfile(), { wrapper });
    await expect(failing.current.mutateAsync({ username: 'amy' })).rejects.toBeDefined();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Taken'));
  });

  it('cancels a user subscription and toasts the outcome', async () => {
    apiClient.api.post.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useCancelUserSubscription(), { wrapper });
    await result.current.mutateAsync('s1');
    await waitFor(() =>
      expect(apiClient.api.post).toHaveBeenCalledWith('/subscriptions/s1/cancel')
    );
    expect(toast.success).toHaveBeenCalledWith('Subscription cancelled.');

    apiClient.api.post.mockRejectedValue({ response: { data: { detail: 'Too late' } } });
    const { result: failing } = renderHook(() => useCancelUserSubscription(), { wrapper });
    await expect(failing.current.mutateAsync('s1')).rejects.toBeDefined();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Too late'));
  });

  it('deletes devices through the device endpoint', async () => {
    apiClient.api.delete.mockResolvedValue({ data: {} });
    const deleted = renderHook(() => useDeleteDevice(), { wrapper });
    await deleted.result.current.mutateAsync('d1');
    await waitFor(() => expect(apiClient.api.delete).toHaveBeenCalledWith('/vpn-devices/d1'));
  });

  it('loads currencies, public plans, crypto prices, and fx rates', async () => {
    apiClient.api.get.mockResolvedValue({ data: { currencies: ['usd'] } });
    const currencies = renderHook(() => useSupportedCurrencies(), { wrapper });
    await waitFor(() => expect(currencies.result.current.isSuccess).toBe(true));
    expect(apiClient.api.get).toHaveBeenCalledWith('/crypto/currencies');

    apiClient.api.get.mockResolvedValue({ data: [{ id: 'p1' }] });
    const plans = renderHook(() => usePublicPlans(), { wrapper });
    await waitFor(() => expect(plans.result.current.isSuccess).toBe(true));
    expect(apiClient.api.get).toHaveBeenCalledWith('/plans');
    expect(plans.result.current.data).toEqual([{ id: 'p1' }]);

    apiClient.api.get.mockResolvedValue({ data: { bitcoin: 1 } });
    const prices = renderHook(() => useCryptoPrices('EUR'), { wrapper });
    await waitFor(() => expect(prices.result.current.isSuccess).toBe(true));
    expect(apiClient.api.get).toHaveBeenCalledWith('/crypto/prices', {
      params: { fiat_currency: 'EUR' },
    });

    apiClient.api.get.mockResolvedValue({ data: { rate_to_usd: 0.8 } });
    const fx = renderHook(() => useFxRate('EUR'), { wrapper });
    await waitFor(() => expect(fx.result.current.isSuccess).toBe(true));
    expect(apiClient.api.get).toHaveBeenCalledWith('/crypto/fx-rate', {
      params: { fiat_currency: 'EUR' },
    });
  });

  it('disables currency, price, fx, and status queries when gated', () => {
    renderHook(() => useSupportedCurrencies({ enabled: false }), { wrapper });
    renderHook(() => useCryptoPrices('USD', { enabled: false }), { wrapper });
    renderHook(() => useFxRate('USD', { enabled: false }), { wrapper });
    renderHook(() => useInvoiceStatus('inv1', { enabled: false }), { wrapper });

    expect(apiClient.api.get).not.toHaveBeenCalled();
  });

  it('polls the invoice status until it settles', async () => {
    apiClient.api.get.mockResolvedValue({ data: { status: 'pending' } });
    const { result } = renderHook(() => useInvoiceStatus('inv1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.api.get).toHaveBeenCalledWith('/invoices/inv1/status');

    vi.clearAllMocks();
    const disabled = renderHook(() => useInvoiceStatus(undefined), { wrapper });
    expect(disabled.result.current.fetchStatus).toBe('idle');
    expect(apiClient.api.get).not.toHaveBeenCalled();
  });

  it('cancels an invoice through the cancel endpoint', async () => {
    apiClient.api.post.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useCancelInvoice(), { wrapper });
    await result.current.mutateAsync('inv1');
    await waitFor(() => expect(apiClient.api.post).toHaveBeenCalledWith('/invoices/inv1/cancel'));
  });

  it('requests account deletion via POST /users/delete-request', async () => {
    apiClient.api.post.mockResolvedValue({ data: { ok: true } });
    const { result } = renderHook(() => useRequestAccountDeletion(), { wrapper });
    await result.current.mutateAsync();
    await waitFor(() => expect(apiClient.api.post).toHaveBeenCalledWith('/users/delete-request'));
  });
});
