// src/utils/errorHandler.jsx
import { toast } from 'react-toastify';

/**
 * Extracts a human-readable message from a FastAPI-style error without firing
 * any toasts. Array details collapse to the first validation message.
 *
 * @param {Error} err - The error object caught from an async/axios operation.
 * @param {string} [fallback='An unexpected error occurred.'] - Fallback message.
 * @returns {string}
 */
export const getApiError = (err, fallback = 'An unexpected error occurred.') => {
  const detail = err?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail[0]?.msg || fallback;
  }
  if (typeof detail === 'string') {
    return detail;
  }
  if (err?.response?.data?.message) {
    return err.response.data.message;
  }
  return fallback;
};

/**
 * Parses and displays API error messages via toast notifications.
 * Handles FastAPI-style array details, string details, and general fallbacks.
 *
 * @param {Error} err - The error object caught from an async/axios operation.
 * @param {string} [fallbackMsg='An unexpected error occurred.'] - Default fallback toast message.
 */
export const handleApiError = (err, fallbackMsg = 'An unexpected error occurred.') => {
  const detail = err?.response?.data?.detail;

  if (Array.isArray(detail)) {
    detail.forEach((error) => {
      const field = error.loc?.[error.loc.length - 1] || 'Field';
      const formattedField = field.charAt(0).toUpperCase() + field.slice(1);
      toast.error(`${formattedField}: ${error.msg}`);
    });
    return;
  }
  // String details, `message` fields, and the fallback share one parser with
  // getApiError so the two helpers can never drift apart.
  toast.error(getApiError(err, fallbackMsg));
};
