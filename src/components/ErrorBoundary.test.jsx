import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ErrorBoundary from './ErrorBoundary';

const Boom = ({ error }) => {
  throw error;
};

const chunkError = () => {
  const error = new Error('Failed to fetch dynamically imported module');
  return error;
};

describe('ErrorBoundary', () => {
  const originalLocation = window.location;
  let reloadSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    // jsdom makes location.reload/href non-configurable; the supported escape
    // hatch is replacing the configurable `location` property on window.
    reloadSpy = vi.fn();
    delete window.location;
    window.location = { ...originalLocation, reload: reloadSpy };
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    window.location = originalLocation;
    consoleErrorSpy.mockRestore();
  });

  it('renders children while nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('renders the fallback UI instead of children after a runtime crash', () => {
    render(
      <ErrorBoundary>
        <Boom error={new Error('kaboom')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Operation Halted')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Gear' })).toBeInTheDocument();
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('resets the boundary when the fallback button is clicked', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ErrorBoundary>
        <Boom error={new Error('kaboom')} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Operation Halted')).toBeInTheDocument();

    rerender(
      <ErrorBoundary>
        <p>Recovered</p>
      </ErrorBoundary>
    );
    await user.click(screen.getByRole('button', { name: /reload operational console/i }));

    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });

  it('auto-reloads exactly once for a stale chunk error', () => {
    render(
      <ErrorBoundary>
        <Boom error={chunkError()} />
      </ErrorBoundary>
    );

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('chunk_retry_reload')).toBeTypeOf('string');
  });

  it('stays on the fallback while inside the reload cooldown window', () => {
    sessionStorage.setItem('chunk_retry_reload', String(Date.now()));

    render(
      <ErrorBoundary>
        <Boom error={chunkError()} />
      </ErrorBoundary>
    );

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(screen.getByText('Operation Halted')).toBeInTheDocument();
  });

  it('recognizes ChunkLoadError by name as a stale chunk too', () => {
    const namedError = new Error('anything');
    namedError.name = 'ChunkLoadError';

    render(
      <ErrorBoundary>
        <Boom error={namedError} />
      </ErrorBoundary>
    );

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });
});
