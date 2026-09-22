import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { DetailShell } from './DetailShell';

// Wraps every render in a router so useNavigate works.
const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('DetailShell', () => {
  it('renders the loading component while loading', () => {
    renderWithRouter(
      <DetailShell
        loading
        loadingComponent={<div data-testid="spinner">Loading…</div>}
        data={null}
      />
    );
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders children once data is present and not loading', () => {
    renderWithRouter(
      <DetailShell loading={false} data={{ id: 1 }}>
        <div data-testid="content">Detail content</div>
      </DetailShell>
    );
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders an error alert with a retry button when there is an error', () => {
    const refetch = vi.fn();
    renderWithRouter(<DetailShell loading={false} error="boom" data={null} refetch={refetch} />);
    expect(screen.getByText(/boom/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows a not-found message for empty data and no error', () => {
    renderWithRouter(
      <DetailShell loading={false} error={null} data={null} notFoundMessage="Invoice not found." />
    );
    expect(screen.getByText(/Invoice not found/)).toBeInTheDocument();
  });

  it('renders a back button when onBack is provided and fires it on click', () => {
    const onBack = vi.fn();
    renderWithRouter(
      <DetailShell loading={false} data={null} onBack={onBack} backLabel="← Back to List" />
    );
    const btn = screen.getByRole('button', { name: /back to list/i });
    fireEvent.click(btn);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('does not render a back button when neither backTo nor onBack is given', () => {
    renderWithRouter(<DetailShell loading={false} error="oops" data={null} />);
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
  });

  it('renders children even when data is null if nullCheck is disabled', () => {
    renderWithRouter(
      <DetailShell loading={false} data={null} nullCheck={false}>
        <div data-testid="content">Create-new form</div>
      </DetailShell>
    );
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});
