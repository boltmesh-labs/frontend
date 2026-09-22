import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/**
 * Sends the public support-contact form. It goes through `apiClient.api` so
 * the request shares the configured baseURL/timeout with every other call.
 *
 * The caller owns abort semantics: pass an AbortSignal to cancel an in-flight
 * submission on unmount (see pages/Contact.jsx). Feedback is inline on the
 * page (alerts, not toasts), so the mutation stays feedback-free.
 */
export const useSendContactMessage = () => {
  return useMutation({
    mutationFn: async ({ formData, signal }) => {
      const payload = {
        ...formData,
        subject: formData.subject.trim() || 'General Support Inquiry',
      };
      const { data } = await apiClient.api.post('/support/contact', payload, { signal });
      return data;
    },
  });
};
