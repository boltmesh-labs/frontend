import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StatusAlert } from './StatusAlert';

describe('StatusAlert', () => {
  it('renders nothing when there is no message or children', () => {
    const { container } = render(<StatusAlert />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a plain string message', () => {
    render(<StatusAlert message="Invoice not found." />);
    expect(screen.getByText(/Invoice not found/)).toBeInTheDocument();
  });

  it('normalizes an Error instance instead of crashing the tree', () => {
    // This is exactly what react-query hands pages via `message={error}`; the
    // previous code tried to render the Error object as a child and threw.
    render(<StatusAlert message={new Error('boom')} />);
    expect(screen.getByText(/unexpected error/)).toBeInTheDocument();
  });

  it('surfaces FastAPI-style detail from an axios-shaped error', () => {
    const axiosShaped = { response: { data: { detail: 'Payment method not supported.' } } };
    render(<StatusAlert message={axiosShaped} />);
    expect(screen.getByText(/Payment method not supported/)).toBeInTheDocument();
  });

  it('passes JSX messages through untouched', () => {
    render(<StatusAlert message={<strong data-testid="rich">Custom node</strong>} />);
    expect(screen.getByTestId('rich')).toHaveTextContent('Custom node');
  });

  it('fires the retry handler when clicked', () => {
    const onRetry = vi.fn();
    render(<StatusAlert message="boom" onRetry={onRetry} />);
    screen.getByRole('button', { name: /retry/i }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
