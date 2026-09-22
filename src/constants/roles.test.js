// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { USER_ROLES } from './roles';

describe('USER_ROLES', () => {
  it('exposes the user and admin role literals', () => {
    expect(USER_ROLES).toEqual({ user: 'user', admin: 'admin' });
  });

  it('maps each key to its own literal', () => {
    Object.entries(USER_ROLES).forEach(([key, value]) => {
      expect(value).toBe(key);
    });
  });
});
