import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TableFiltersBar } from './TableFiltersBar';

const STATUS_FILTER = {
  ariaLabel: 'Filter by status',
  value: '',
  onChange: vi.fn(),
  options: [
    { value: '', label: 'All' },
    { value: 'active', label: 'Active' },
  ],
};

describe('TableFiltersBar', () => {
  it('wires search typing and filter changes back to the handlers', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    const onChange = vi.fn();

    render(
      <TableFiltersBar
        searchInput=""
        onSearchChange={onSearchChange}
        filters={[{ ...STATUS_FILTER, onChange }]}
        onClear={vi.fn()}
      />
    );

    await user.type(screen.getByRole('searchbox', { name: 'Search table' }), 'a');
    expect(onSearchChange).toHaveBeenCalledWith('a');

    await user.selectOptions(screen.getByLabelText('Filter by status'), 'active');
    expect(onChange).toHaveBeenCalledWith('active');
  });

  it.each([
    [0, 'col-md-10'],
    [1, 'col-md-8'],
    [2, 'col-md-6'],
    [3, 'col-md-4'],
    [4, 'col-md-2'],
  ])('shrinks the search column as filters grow (%i filters)', (filterCount, expectedClass) => {
    const filters = Array.from({ length: filterCount }, (_v, idx) => ({
      ariaLabel: `Filter ${idx}`,
      value: '',
      onChange: vi.fn(),
      options: [{ value: '', label: 'All' }],
    }));

    const { container } = render(
      <TableFiltersBar
        searchInput=""
        onSearchChange={vi.fn()}
        filters={filters}
        onClear={vi.fn()}
      />
    );

    expect(container.querySelector(`.${expectedClass}`)).not.toBeNull();
  });

  it('honors the Clear button disabled state and custom placeholder', () => {
    render(
      <TableFiltersBar
        searchInput="term"
        onSearchChange={vi.fn()}
        onClear={vi.fn()}
        isClearDisabled
        searchPlaceholder="Find things"
      />
    );

    expect(screen.getByPlaceholderText('Find things')).toHaveValue('term');
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
  });
});
