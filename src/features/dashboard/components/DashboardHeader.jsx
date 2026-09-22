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
    <div className="d-flex align-items-center justify-content-between mb-4 border-bottom pb-3">
      <div className="text-start">
        <h2 className="fw-bold text-body mb-1">{title}</h2>
        {subtitle && <p className="text-muted small mb-0">{subtitle}</p>}
      </div>

      <div className="d-flex align-items-center gap-2">
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
