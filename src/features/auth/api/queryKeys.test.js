// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { authKeys } from './queryKeys';

describe('authKeys', () => {
  it('scopes every key under the auth family', () => {
    expect(authKeys.all).toEqual(['auth']);
    expect(authKeys.login()).toEqual(['auth', 'login']);
    expect(authKeys.register()).toEqual(['auth', 'register']);
    expect(authKeys.forgotPassword()).toEqual(['auth', 'forgot-password']);
    expect(authKeys.resetPassword()).toEqual(['auth', 'reset-password']);
    expect(authKeys.activateAccount()).toEqual(['auth', 'activate-account']);
  });
});
