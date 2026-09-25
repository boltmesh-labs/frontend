import { Card, Table, Spinner } from 'react-bootstrap';
import { LoadingOverlay } from '@/components/LoadingOverlay';

export const DataTable = ({
  columns,
  data,
  renderRow,
  renderMobileItem,
  loading = false,
  emptyMessage = 'No records found matching your request.',
  loadingMessage = 'Synchronizing records...',
}) => {
  const hasData = Array.isArray(data) && data.length > 0;
  const hasMobileRenderer = typeof renderMobileItem === 'function';

  return (
    <Card className="border-0 shadow-sm overflow-hidden position-relative bg-body-tertiary mb-4">
      {/* Semi-transparent spinner overlay for background re-fetching */}
      <LoadingOverlay show={loading && hasData} />

      {/* Full spinner state when initial data is loading */}
      {loading && !hasData ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label={loadingMessage}
          className="text-center py-5"
        >
          <Spinner animation="border" variant="primary" className="mb-2" aria-hidden="true" />
          <p className="text-muted small m-0">{loadingMessage}</p>
        </div>
      ) : (
        <>
          {hasMobileRenderer && (
            <div className="d-md-none">
              {hasData ? (
                data.map((item, index) => (
                  <div className="border-bottom" key={item.id ?? index}>
                    {renderMobileItem(item, index)}
                  </div>
                ))
              ) : (
                <div className="text-center text-muted py-4 px-3 small">{emptyMessage}</div>
              )}
            </div>
          )}

          <Table
            responsive
            hover
            className={`align-middle mb-0 small ${hasMobileRenderer ? 'mobile-hidden-table' : ''}`}
          >
            <thead className="text-uppercase small text-secondary">
              <tr>
                {columns.map((col, idx) => {
                  // Stable identity per column: an explicit `key` wins, then the
                  // header text (unique within every current table config —
                  // verified), then position as a last resort. Dynamic tables
                  // that reorder or repeat headers must set `key` explicitly.
                  const columnKey = col.key ?? col.header ?? idx;
                  return (
                    <th
                      key={columnKey}
                      scope="col"
                      className={col.className || ''}
                      style={col.style}
                    >
                      {col.header}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="small">
              {hasData ? (
                data.map((item, index) => renderRow(item, index))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="text-center text-muted py-4 small">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </>
      )}
    </Card>
  );
};
