import { toast } from 'react-toastify';

/**
 * Copy text to the system clipboard with a fallback for non-secure contexts
 * (e.g. plain HTTP). Returns true on success, false on failure.
 */
export const copyTextToClipboard = async (text) => {
  if (!text) return false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Copy text to the clipboard and surface the result through a toast.
 * Pass `{ success: null, error: null }` to suppress toasts and only use the
 * boolean return value.
 *
 * @param {string} text - text to copy
 * @param {{ success?: string | null, error?: string | null }} [options] - optional toast messages
 * @returns {Promise<boolean>} true on success, false on failure
 */
export const copyToClipboard = async (
  text,
  { success = 'Copied to clipboard!', error = 'Failed to copy text string' } = {}
) => {
  if (!text) return false;

  const ok = await copyTextToClipboard(text);
  if (ok) {
    if (success) toast.success(success);
  } else if (error) {
    toast.error(error);
  }
  return ok;
};
