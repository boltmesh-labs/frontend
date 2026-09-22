import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataTable } from './DataTable';

const COLUMNS = [{ header: 'Name' }, { header: 'Status' }];

const renderRow = (item) => (
  <tr key={item.id}>
    <td>{item.name}</td>
    <td>{item.status}</td>
  </tr>
);

const DATA = [
  { id: 1, name: 'Alpha', status: 'on' },
  { id: 2, name: 'Beta', status: 'off' },
];

describe('DataTable', () => {
  it('renders column headers', () => {
    render(<DataTable columns={COLUMNS} data={[]} renderRow={renderRow} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('shows the empty message when there is no data', () => {
    render(
      <DataTable columns={COLUMNS} data={[]} renderRow={renderRow} emptyMessage="Nothing here." />
    );
    expect(screen.getByText('Nothing here.')).toBeInTheDocument();
  });

  it('renders rows using the renderRow callback', () => {
    render(<DataTable columns={COLUMNS} data={DATA} renderRow={renderRow} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('shows the full spinner state during initial load', () => {
    render(
      <DataTable
        columns={COLUMNS}
        data={[]}
        renderRow={renderRow}
        loading
        loadingMessage="Syncing records..."
      />
    );
    expect(screen.getByText('Syncing records...')).toBeInTheDocument();
  });

  it('uses explicit col.key so repeated headers never collide', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const duplicatedHeaders = [
      { header: 'Status', key: 'peer-status' },
      { header: 'Status', key: 'server-status' },
    ];

    render(<DataTable columns={duplicatedHeaders} data={DATA} renderRow={renderRow} />);

    expect(screen.getAllByText('Status')).toHaveLength(2);
    expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining('same key'));
    consoleError.mockRestore();
  });

  it('keeps rows visible with an overlay while refetching', () => {
    const { container } = render(
      <DataTable columns={COLUMNS} data={DATA} renderRow={renderRow} loading />
    );
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(container.querySelector('.spinner-border')).toBeInTheDocument();
  });
});
