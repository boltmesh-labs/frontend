import { Spinner } from 'react-bootstrap';

/**
 * Reusable page-level loading indicator. Defaults to a full-viewport centered
 * spinner (used by early-return loading branches); pass `fullscreen={false}`
 * for a compact inline version.
 */
export const PageLoader = ({ message, fullscreen = true, className = '' }) => (
  <div
    role="status"
    aria-live="polite"
    aria-busy="true"
    aria-label={message || 'Loading'}
    className={`d-flex justify-content-center align-items-center ${
      fullscreen ? 'min-vh-100 bg-body' : ''
    }${className ? ` ${className}` : ''}`}
  >
    <Spinner animation="border" variant="primary" className={message ? 'mb-2' : ''} />
    {message && <span className="text-body-secondary small ms-2">{message}</span>}
  </div>
);
