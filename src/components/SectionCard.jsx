import { Card } from 'react-bootstrap';

/**
 * Card wrapper for detail-page "related records" sections with a header row.
 */
export const SectionCard = ({ title, subtitle, actions, className = '', children }) => (
  <Card className={`border-0 shadow-sm bg-body-tertiary rounded-3 ${className}`.trim()}>
    <div className="p-3">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h5 className="fw-bold mb-0 text-body">{title}</h5>
          {subtitle && <p className="text-muted small mb-0 mt-1">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  </Card>
);
