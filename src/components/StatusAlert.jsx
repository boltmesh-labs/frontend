import { Alert, Button } from 'react-bootstrap';

import { getApiError } from '@/utils/errorHandler';

/**
 * Reusable alert banner supporting any bootstrap variant and a free-form
 * message via `message` (or `children`).
 *
 * Every list/detail page passes react-query's `error` (an Error/AxiosError
 * instance) via `message`, and React cannot render an Error object as a
 * child — that combination previously crashed the ErrorBoundary instead of
 * showing this banner. Error instances and Axios-shaped plain objects are
 * normalized to a user-safe string here; string and JSX messages pass
 * through untouched.
 */
const normalizeMessage = (message) => {
  const isErrorLike =
    message instanceof Error ||
    (typeof message === 'object' &&
      message !== null &&
      !Array.isArray(message) &&
      !message.$$typeof);
  return isErrorLike ? getApiError(message) : message;
};

export const StatusAlert = ({
  message,
  onRetry,
  variant = 'danger',
  children,
  className = 'mb-4 p-3',
}) => {
  const safeMessage = normalizeMessage(message);

  if (!safeMessage && children === undefined) return null;

  return (
    <Alert
      variant={variant}
      className={`border-0 shadow-sm ${className} d-flex align-items-center justify-content-between`}
    >
      <span className="small fw-medium">
        {variant === 'danger' ? '⚠️ ' : ''}
        {safeMessage}
        {children}
      </span>
      {onRetry && (
        <Button variant={`outline-${variant}`} size="sm" className="fw-bold" onClick={onRetry}>
          Retry
        </Button>
      )}
    </Alert>
  );
};
