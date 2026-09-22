import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// Pure unit tests opt into `// @vitest-environment node` to skip jsdom startup;
// this file still runs for them, so every DOM touch below is guarded.
const hasDom = typeof window !== 'undefined';

if (hasDom) {
  // jsdom does not implement matchMedia; MainLayout and other components rely on it.
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      enumerable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }

  // jsdom implements scrollTo only as a "Not implemented"-throwing stub;
  // components that scroll on route change need a silent mock instead.
  window.scrollTo = vi.fn();
}

// Keep storage isolated between tests.
beforeEach(() => {
  if (!hasDom) return;
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  if (hasDom) cleanup();
});
