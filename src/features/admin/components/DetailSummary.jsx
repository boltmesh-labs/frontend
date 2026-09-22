import { Card, Table } from 'react-bootstrap';

/**
 * A reusable summary card displaying a header status badge,
 * key-value meta items in a table format, and optional footer slots.
 */
export const DetailSummary = ({ statusLabel, badge, items = [], children, className = '' }) => {
  return (
    <Card className={`border-0 shadow-sm bg-body-tertiary p-4 h-100 rounded-3 ${className}`}>
      {/* Header section with status badge */}
      {(statusLabel || badge) && (
        <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
          <div>
            {statusLabel && (
              <span className="text-muted text-uppercase small font-monospace fw-bold d-block mb-1">
                {statusLabel}
              </span>
            )}
            {badge}
          </div>
        </div>
      )}

      {/* Dynamic Key-Value Rows */}
      {items.length > 0 && (
        <Table responsive borderless className="align-middle m-0 small">
          <tbody>
            {items.map((item, index) => {
              if (!item) return null;
              const isLast = index === items.length - 1;

              return (
                <tr key={item.label || index} className={isLast ? 'border-bottom' : ''}>
                  <td className="text-secondary py-2">{item.label}:</td>
                  <td
                    className={`text-end font-monospace ${item.className || 'fw-bold text-body'}`}
                  >
                    {item.value ?? 'N/A'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {/* Slot for extra widgets like CopyableField, buttons, or notes */}
      {children}
    </Card>
  );
};
