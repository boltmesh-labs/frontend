// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { sanitizeRedirectPath } from './config';

describe('sanitizeRedirectPath', () => {
  it('allows same-app absolute paths unchanged', () => {
    expect(sanitizeRedirectPath('/dashboard')).toBe('/dashboard');
    expect(sanitizeRedirectPath('/')).toBe('/');
    expect(sanitizeRedirectPath('/invoices/42?tab=payments#summary')).toBe(
      '/invoices/42?tab=payments#summary'
    );
  });

  it('rejects protocol-relative and scheme-bearing URLs', () => {
    expect(sanitizeRedirectPath('//evil.com')).toBe('/dashboard');
    expect(sanitizeRedirectPath('https://evil.com')).toBe('/dashboard');
    expect(sanitizeRedirectPath('javascript:alert(1)')).toBe('/dashboard');
    expect(sanitizeRedirectPath('invoices')).toBe('/dashboard');
  });

  it('rejects browser-normalized and control-character variants', () => {
    expect(sanitizeRedirectPath('/\\evil.com')).toBe('/dashboard');
    expect(sanitizeRedirectPath('/dashboard\nLocation: https://evil.com')).toBe('/dashboard');
    expect(sanitizeRedirectPath('/dashboard\u0000')).toBe('/dashboard');
  });

  it('falls back for non-string input', () => {
    expect(sanitizeRedirectPath(null)).toBe('/dashboard');
    expect(sanitizeRedirectPath(undefined)).toBe('/dashboard');
    expect(sanitizeRedirectPath({ pathname: '/x' })).toBe('/dashboard');
  });

  it('honors a custom fallback', () => {
    expect(sanitizeRedirectPath('//evil.com', '/login')).toBe('/login');
    expect(sanitizeRedirectPath(null, '/unauthorized')).toBe('/unauthorized');
  });
});
