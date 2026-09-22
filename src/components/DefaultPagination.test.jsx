import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DefaultPagination } from './DefaultPagination';

describe('DefaultPagination', () => {
  it('renders nothing when there is a single page', () => {
    const { container } = render(
      <DefaultPagination currentPage={1} totalPages={1} totalCount={5} onPageChange={vi.fn()} />
    );
    expect(container.childElementCount).toBe(0);
  });

  it('shows the record range and pagination controls', () => {
    render(
      <DefaultPagination
        currentPage={2}
        totalPages={5}
        totalCount={42}
        pageSize={10}
        onPageChange={vi.fn()}
      />
    );
    expect(screen.getByText('Showing 11–20 of 42')).toBeInTheDocument();
    expect(screen.getByText('‹')).toBeInTheDocument();
    expect(screen.getByText('›')).toBeInTheDocument();
  });

  it('calls onPageChange with the requested page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(
      <DefaultPagination
        currentPage={2}
        totalPages={5}
        totalCount={25}
        pageSize={10}
        onPageChange={onPageChange}
      />
    );

    await user.click(screen.getByText('3'));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await user.click(screen.getByText('›'));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await user.click(screen.getByText('‹'));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('disables the previous control on the first page', () => {
    render(
      <DefaultPagination
        currentPage={1}
        totalPages={3}
        totalCount={30}
        pageSize={10}
        onPageChange={vi.fn()}
      />
    );
    expect(screen.getByText('‹').closest('li')).toHaveClass('disabled');
    expect(screen.getByText('›').closest('li')).not.toHaveClass('disabled');
  });

  it('disables controls while loading', () => {
    render(
      <DefaultPagination
        currentPage={2}
        totalPages={3}
        totalCount={30}
        pageSize={10}
        onPageChange={vi.fn()}
        loading
      />
    );
    expect(screen.getByText('›').closest('li')).toHaveClass('disabled');
  });
});
