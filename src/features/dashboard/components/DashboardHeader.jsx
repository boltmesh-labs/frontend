import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

export const DashboardHeader = ({
  title,
  subtitle,
  backTo = '/dashboard',
  backLabel = '← Back',
  rightAction,
}) => {
  const navigate = useNavigate();

  return (
    <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-4 border-bottom pb-3">
      <div className="text-start min-w-0">
        <h2 className="fw-bold text-body mb-1 text-break">{title}</h2>
        {subtitle && <p className="text-muted small mb-0 text-break">{subtitle}</p>}
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2">
        {rightAction}
        {backTo && (
          <Button
            variant="outline-secondary"
            size="sm"
            className="fw-bold px-3 py-2 text-nowrap"
            onClick={() => navigate(backTo)}
          >
            {backLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
