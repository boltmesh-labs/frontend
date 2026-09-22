import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { extractList } from '@/utils/apiResponse';
import { TERMINAL_INVOICE_STATUSES } from '@/constants/statuses';
import { dashboardKeys } from '../api/queryKeys';
import { getApiError } from '@/utils/errorHandler';
import { toast } from 'react-toastify';

export const useDashboardProfile = () => {
  return useQuery({
    queryKey: dashboardKeys.profile(),
    queryFn: async () => {
      const { data } = await apiClient.api.get('/users');
      return data;
    },
    // Plan/subscription state can change server-side at any time (payment
    // webhooks settle invoices without a frontend mutation), so never serve
    // the cached profile as fresh: always refetch on mount.
    staleTime: 0,
  });
};

export const useUserSubscriptions = () => {
  return useQuery({
    queryKey: dashboardKeys.subscriptions(),
    queryFn: async () => {
      const { data } = await apiClient.api.get('/subscriptions');
      return extractList(data);
    },
    placeholderData: (prev) => prev,
    // Subscription state changes server-side on payment settlement; always
    // refetch on mount instead of trusting the global staleTime.
    staleTime: 0,
  });
};

export const useUserSubscriptionDetail = (id) => {
  return useQuery({
    queryKey: dashboardKeys.subscriptionDetail(id),
    queryFn: async () => {
      const { data } = await apiClient.api.get(`/subscriptions/${id}`);
      return data;
    },
    enabled: Boolean(id) && id !== 'new',
  });
};

export const usePlanDetail = (id) => {
  return useQuery({
    queryKey: dashboardKeys.planDetail(id),
    queryFn: async () => {
      // Public endpoint; the backend 404s for unknown or disabled plans.
      const { data } = await apiClient.api.get(`/plans/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
};

export const useUserInvoices = (params = {}) => {
  return useQuery({
    queryKey: dashboardKeys.invoices(params),
    queryFn: async () => {
      // GET /v1/invoices supports skip/limit pagination only.
      const { data } = await apiClient.api.get('/invoices', { params });
      return data;
    },
    placeholderData: (prev) => prev,
    // New invoices appear server-side as checkout/webhooks run; always
    // refetch on mount instead of trusting the global staleTime.
    staleTime: 0,
  });
};

export const useUserInvoiceDetail = (id) => {
  return useQuery({
    queryKey: dashboardKeys.invoiceDetail(id),
    queryFn: async () => {
      const { data } = await apiClient.api.get(`/invoices/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
};

export const useCreateInvoice = () => {
  return useMutation({
    mutationFn: async (invoiceData) => {
      const { data } = await apiClient.api.post('/invoices', invoiceData);
      return data;
    },
    // No cache side effects here: Checkout navigates to /payment on success
    // and renders API errors inline itself.
  });
};

export const useUserInvoicesBySubscription = (subscriptionId) => {
  return useQuery({
    queryKey: dashboardKeys.invoicesBySubscription(subscriptionId),
    queryFn: async () => {
      const { data } = await apiClient.api.get(`/invoices/by-subscription/${subscriptionId}`);
      return extractList(data);
    },
    enabled: Boolean(subscriptionId),
    staleTime: 0,
  });
};

export const useUserDevices = () => {
  return useQuery({
    queryKey: dashboardKeys.devices(),
    queryFn: async () => {
      const { data } = await apiClient.api.get('/vpn-devices');
      return extractList(data);
    },
    placeholderData: (prev) => prev,
  });
};

export const useUserDevicesBySubscription = (subscriptionId) => {
  return useQuery({
    queryKey: dashboardKeys.devicesBySubscription(subscriptionId),
    queryFn: async () => {
      const { data } = await apiClient.api.get(`/vpn-devices/by-subscription/${subscriptionId}`);
      return extractList(data);
    },
    enabled: Boolean(subscriptionId),
    staleTime: 0,
  });
};

export const useResendActivation = () => {
  return useMutation({
    mutationFn: async () => {
      // This endpoint identifies the recipient from the authenticated user.
      const { data } = await apiClient.api.post('/auth/resend-activation');
      return data;
    },
    onSuccess: () => {
      toast.success('Verification email sent.');
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to send email')),
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: async (passwordData) => {
      const { data } = await apiClient.api.put('/users/change-password', passwordData);
      return data;
    },
    onSuccess: () => {
      toast.success('Password updated successfully.');
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to update password')),
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileData) => {
      const { data } = await apiClient.api.patch('/users', profileData);
      return data;
    },
    onSuccess: () => {
      toast.success('Profile updated successfully.');
      queryClient.invalidateQueries({ queryKey: dashboardKeys.profile() });
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to update profile')),
  });
};

export const useCancelUserSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await apiClient.api.post(`/subscriptions/${id}/cancel`);
      return id;
    },
    onSuccess: (_, id) => {
      toast.success('Subscription cancelled.');
      queryClient.invalidateQueries({ queryKey: dashboardKeys.subscriptions() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.subscriptionDetail(id) });
    },
    onError: (err) => toast.error(getApiError(err, 'Cancellation failed')),
  });
};

export const useDeleteDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await apiClient.api.delete(`/vpn-devices/${id}`);
      return id;
    },
    // Success/error toasts are handled by the calling page (DeviceList) so it can
    // include the device name; this hook only manages cache invalidation.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.devices() });
    },
  });
};

// --- Public catalog / checkout / payment-status queries --------------------

export const useSupportedCurrencies = ({ enabled = true } = {}) => {
  return useQuery({
    queryKey: dashboardKeys.currencies(),
    queryFn: async () => {
      // GET /v1/crypto/currencies -> { currencies: ['usd', ...] } carrying
      // lowercase ISO 4217 codes from SUPPORTED_FIAT_CURRENCIES. Static config,
      // so the global staleTime applies — no refetch-on-mount needed.
      const { data } = await apiClient.api.get('/crypto/currencies');
      return data;
    },
    enabled,
  });
};

export const usePublicPlans = () => {
  return useQuery({
    queryKey: dashboardKeys.plans(),
    queryFn: async () => {
      // Public endpoint; shape normalized to a bare array for consumers.
      const { data } = await apiClient.api.get('/plans');
      return extractList(data);
    },
  });
};

export const useCryptoPrices = (fiatCurrency = 'USD', { enabled = true } = {}) => {
  return useQuery({
    queryKey: dashboardKeys.cryptoPrices(fiatCurrency),
    queryFn: async () => {
      const { data } = await apiClient.api.get('/crypto/prices', {
        params: { fiat_currency: fiatCurrency },
      });
      return data;
    },
    refetchInterval: 60000,
    enabled,
  });
};

export const useFxRate = (fiatCurrency = 'USD', { enabled = true } = {}) => {
  return useQuery({
    queryKey: dashboardKeys.fxRate(fiatCurrency),
    queryFn: async () => {
      // GET /v1/crypto/fx-rate -> { fiat_currency, rate_to_usd } where
      // rate_to_usd is the USD cost of one unit of fiat_currency.
      const { data } = await apiClient.api.get('/crypto/fx-rate', {
        params: { fiat_currency: fiatCurrency },
      });
      return data;
    },
    // Rates move slowly and the backend caches them for FX_RATE_TTL_SECONDS;
    // a periodic refresh keeps the preview honest without hammering CoinGecko.
    refetchInterval: 60000,
    staleTime: 60000,
    enabled,
  });
};

const INVOICE_STATUS_POLL_MS = 15000;

export const useInvoiceStatus = (invoiceId, { enabled = true } = {}) => {
  return useQuery({
    queryKey: dashboardKeys.invoiceStatus(invoiceId),
    queryFn: async () => {
      const { data } = await apiClient.api.get(`/invoices/${invoiceId}/status`);
      return data;
    },
    // Poll only until the invoice reaches a terminal state (settlement lands
    // via provider webhook -> backend); afterwards stop hitting the endpoint.
    refetchInterval: (query) => {
      const status = query.state.data?.status?.toLowerCase();
      return TERMINAL_INVOICE_STATUSES.includes(status) ? false : INVOICE_STATUS_POLL_MS;
    },
    enabled: enabled && Boolean(invoiceId),
  });
};

export const useCancelInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await apiClient.api.post(`/invoices/${id}/cancel`);
      return id;
    },
    // Success/error toasts are handled by the calling page (InvoiceDetail);
    // this hook refreshes the cached invoice and its polled status key, which
    // refetches any active query without a manual refetch() at the call site.
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.invoiceDetail(id) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.invoiceStatus(id) });
    },
  });
};

export const useRequestAccountDeletion = () => {
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.api.post('/users/delete-request');
      return data;
    },
    // Feedback is owned by AccountSettings (inline confirmation panel), so no
    // toasts here — mirrors useDeleteDevice.
  });
};
