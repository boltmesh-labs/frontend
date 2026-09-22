import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

/**
 * DetailHeader
 * A reusable header component for administrative detail pages.
 *
 * @param {string} title - The primary heading text.
 * @param {React.ReactNode} [badge] - An optional badge component (e.g. status indicator).
 * @param {string|number} [id] - Optional ID label displayed below or beside the title.
 * @param {string} [idPrefix='ID:'] - Prefix for the ID string.
 * @param {React.ReactNode} [actions] - Action buttons or elements displayed on the right.
 * @param {string} [className] - Additional wrapper CSS classes.
 * @param {boolean} [showBackButton=true] - Whether to render the default back button.
 * @param {string} [backButtonLabel='↩ Back'] - Text or label for the default back button.
 * @param {string} [backButtonAriaLabel='Back to previous page'] - Accessibility label for the back button.
 */
export const DetailHeader = ({
  title,
  badge,
  id,
  idPrefix = 'UUID:',
  actions,
  className = '',
  showBackButton = true,
  backButtonLabel = '↩ Back',
  backButtonAriaLabel = 'Back to previous page',
}) => {
  const navigate = useNavigate();
  return (
    <div
      className={`d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 ${className}`}
    >
      <div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <h2 className="fw-bold mb-0 text-body">{title}</h2>
          {badge}
        </div>
        {id !== undefined && id !== null && (
          <span className="text-muted small font-monospace d-inline-block mt-1">
            {idPrefix} {id}
          </span>
        )}
      </div>

      <div className="d-flex gap-2 flex-wrap align-items-center">
        {actions}
        {showBackButton && (
          <Button
            variant="outline-secondary"
            className="shadow-sm"
            onClick={() => navigate(-1)}
            aria-label={backButtonAriaLabel}
          >
            {backButtonLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
