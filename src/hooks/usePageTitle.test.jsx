import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePageTitle } from './usePageTitle';

describe('usePageTitle', () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta name="description" content="original" />';
  });

  it('sets the document title', () => {
    renderHook(() => usePageTitle('My Page'));
    expect(document.title).toBe('My Page');
  });

  it('sets the meta description when provided', () => {
    renderHook(() => usePageTitle('My Page', 'A great description.'));
    const meta = document.querySelector('meta[name="description"]');
    expect(meta.getAttribute('content')).toBe('A great description.');
  });

  it('leaves the meta description untouched when omitted', () => {
    renderHook(() => usePageTitle('My Page'));
    const meta = document.querySelector('meta[name="description"]');
    expect(meta.getAttribute('content')).toBe('original');
  });
});
