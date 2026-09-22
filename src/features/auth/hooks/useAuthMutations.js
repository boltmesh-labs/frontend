import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export const useLogin = () => {
  return useMutation({
    mutationFn: async (credentials) => {
      // Convert credentials object or URLSearchParams into form-encoded data
      const formData =
        credentials instanceof URLSearchParams
          ? credentials
          : new URLSearchParams({
              username: credentials.username || '',
              password: credentials.password || '',
              ...(credentials.remember_me !== undefined && {
                remember_me: String(credentials.remember_me),
              }),
            });

      const { data } = await apiClient.authApi.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      return data;
    },
    // Login surfaces errors inline on the form (see pages/Login.jsx) instead of
    // toasting, so the message is not duplicated across channels.
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: async (userData) => {
      const { data } = await apiClient.authApi.post('/auth/register', userData);
      return data;
    },
    // Feedback-free by design: Register.jsx renders its own inline success and
    // error alerts, so toasting here would duplicate the channel (same
    // rationale as useLogin and useActivateAccount).
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async (email) => {
      const { data } = await apiClient.authApi.post('/auth/password-reset/request', { email });
      return data;
    },
    // Feedback-free by design: ForgotPassword.jsx renders inline alerts.
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: async ({ token, password }) => {
      const { data } = await apiClient.authApi.post('/auth/password-reset/confirm', {
        token,
        new_password: password,
      });
      return data;
    },
    // Feedback-free by design: ResetPassword.jsx renders inline alerts.
  });
};

export const useActivateAccount = () => {
  return useMutation({
    mutationFn: async (token) => {
      const { data } = await apiClient.authApi.post('/auth/verify-email', { token });
      return data;
    },
    // ActivateAccount renders its own inline success/error alerts, so toasting
    // here as well would duplicate the feedback channels (same rationale as
    // useLogin above).
  });
};

export const useConfirmAccountDeletion = () => {
  return useMutation({
    mutationFn: async (token) => {
      const { data } = await apiClient.authApi.post('/users/delete-confirm', { token });
      return data;
    },
    // ConfirmDelete renders its own inline success/error alerts, so toasting
    // here would duplicate the feedback channels (same rationale as
    // useActivateAccount above).
  });
};
