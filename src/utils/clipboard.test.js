import { describe, expect, it, vi } from 'vitest';
import { copyTextToClipboard, copyToClipboard } from './clipboard';

describe('copyTextToClipboard', () => {
  it('returns false for empty text', async () => {
    expect(await copyTextToClipboard('')).toBe(false);
    expect(await copyTextToClipboard(null)).toBe(false);
  });

  it('uses the async clipboard API in a secure context', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText }, userAgent: 'node' });
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });

    expect(await copyTextToClipboard('secret')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('secret');
  });

  it('falls back to a textarea when clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', { clipboard: null, userAgent: 'node' });
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });

    const select = vi.spyOn(HTMLTextAreaElement.prototype, 'select').mockImplementation(() => {});
    const focus = vi.spyOn(HTMLTextAreaElement.prototype, 'focus').mockImplementation(() => {});
    document.execCommand = vi.fn(() => true);

    expect(await copyTextToClipboard('fallback-text')).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(select).toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();
  });

  it('returns false when copying throws', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: () => Promise.reject(new Error('denied')) },
      userAgent: 'node',
    });
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });

    expect(await copyTextToClipboard('secret')).toBe(false);
  });
});

describe('copyToClipboard', () => {
  const stubNavigator = (writeText) => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: writeText || vi.fn().mockResolvedValue(undefined) },
      userAgent: 'node',
    });
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  };

  it('returns false without toasting for empty text', async () => {
    const { toast } = await import('react-toastify');
    const success = vi.fn();
    const error = vi.fn();
    toast.success = success;
    toast.error = error;

    expect(await copyToClipboard('')).toBe(false);
    expect(await copyToClipboard(null)).toBe(false);
    expect(success).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('shows a success toast with the default message', async () => {
    const { toast } = await import('react-toastify');
    const success = vi.fn();
    toast.success = success;
    stubNavigator();

    expect(await copyToClipboard('secret')).toBe(true);
    expect(success).toHaveBeenCalledWith('Copied to clipboard!');
  });

  it('uses the provided success message', async () => {
    const { toast } = await import('react-toastify');
    const success = vi.fn();
    toast.success = success;
    stubNavigator();

    await copyToClipboard('secret', { success: 'Invoice ID copied!' });
    expect(success).toHaveBeenCalledWith('Invoice ID copied!');
  });

  it('shows an error toast when copying fails', async () => {
    const { toast } = await import('react-toastify');
    const error = vi.fn();
    toast.error = error;
    stubNavigator(() => Promise.reject(new Error('denied')));

    expect(await copyToClipboard('secret')).toBe(false);
    expect(error).toHaveBeenCalledWith('Failed to copy text string');
  });

  it('uses the custom error message', async () => {
    const { toast } = await import('react-toastify');
    const error = vi.fn();
    toast.error = error;
    stubNavigator(() => Promise.reject(new Error('denied')));

    await copyToClipboard('secret', { error: 'Failed to copy Public Key' });
    expect(error).toHaveBeenCalledWith('Failed to copy Public Key');
  });

  it('suppresses all toasts when success and error are null', async () => {
    const { toast } = await import('react-toastify');
    const success = vi.fn();
    const error = vi.fn();
    toast.success = success;
    toast.error = error;
    stubNavigator();

    expect(await copyToClipboard('secret', { success: null, error: null })).toBe(true);
    expect(success).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
