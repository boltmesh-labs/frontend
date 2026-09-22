// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));

vi.mock('react-toastify', () => ({
  toast: { error: toastError },
}));

import { handleApiError } from './errorHandler';

describe('handleApiError', () => {
  beforeEach(() => {
    toastError.mockClear();
  });

  it('shows one toast per FastAPI array detail item with formatted field', () => {
    const err = {
      response: {
        data: {
          detail: [
            { loc: ['body', 'username'], msg: 'Field required' },
            { loc: ['body', 'password'], msg: 'Too short' },
          ],
        },
      },
    };

    handleApiError(err);

    expect(toastError).toHaveBeenCalledTimes(2);
    expect(toastError).toHaveBeenNthCalledWith(1, 'Username: Field required');
    expect(toastError).toHaveBeenNthCalledWith(2, 'Password: Too short');
  });

  it('shows a single toast for string details', () => {
    handleApiError({ response: { data: { detail: 'Bad credentials' } } });
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith('Bad credentials');
  });

  it('falls back to the default message for missing details', () => {
    handleApiError({ response: { data: {} } });
    expect(toastError).toHaveBeenCalledWith('An unexpected error occurred.');
  });

  it('falls back to the custom message when provided', () => {
    handleApiError(new Error('network'), 'Custom failure.');
    expect(toastError).toHaveBeenCalledWith('Custom failure.');
  });
});
