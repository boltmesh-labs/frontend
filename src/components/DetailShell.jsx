import { Container, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

import { PageLoader } from '@/components/PageLoader';
import { StatusAlert } from '@/components/StatusAlert';

/**
 * Reusable skeleton for entity detail pages.
 *
 * Every detail page repeats the same lifecycle:
 *   - show a loader while the single resource is being fetched
 *   - on error or empty result, render a `StatusAlert` (with retry) plus an
 *     optional "Back" navigation button
 *   - otherwise render the page's own content
 *
 * DetailShell centralises that so pages only declare what is specific: the
 * fetch result, the back target, and the actual content.
 *
 * @param {object} props
 * @param {boolean} [props.loading]      - forwarded from `useFetch`
 * @param {string|node} [props.error]    - forwarded from `useFetch`
 * @param {*} [props.data]               - forwarded from `useFetch` (truthy = "found")
 * @param {Function} [props.refetch]     - forwarded from `useFetch` -> wired to the retry button
 * @param {node} [props.children]       - the detail content (rendered when data is present)
 * @param {node} [props.loadingComponent] - overrides the default `<PageLoader />` while loading
 * @param {string} [props.notFoundMessage] - message used for the empty/not-found fallback
 * @param {string} [props.backTo]       - route to navigate to when the back button is pressed
 * @param {string} [props.backLabel]
 * @param {string} [props.backVariant]
 * @param {Function} [props.onBack]     - overrides `backTo` navigation (called with no args)
 * @param {boolean} [props.nullCheck=true] - when false, do NOT treat a missing `data` as an error
 * @param {string} [props.className]    - extra class for the fallback container
 */
export const DetailShell = ({
  loading,
  error,
  data,
  refetch,
  children,
  loadingComponent,
  notFoundMessage = 'The requested resource could not be found.',
  backTo,
  backLabel = '← Back',
  backVariant = 'outline-secondary',
  onBack,
  nullCheck = true,
  className = '',
}) => {
  const navigate = useNavigate();

  if (loading) {
    return loadingComponent ?? <PageLoader />;
  }

  const isEmpty = nullCheck && !data;
  if (error || isEmpty) {
    const message = error || (isEmpty ? notFoundMessage : null);
    return (
      <Container className={`py-4 ${className}`.trim()} style={{ maxWidth: '600px' }}>
        <StatusAlert message={message} onRetry={refetch} />
        {(onBack || backTo) && (
          <div className="text-center mt-3">
            <Button
              variant={backVariant}
              size="sm"
              className="fw-bold rounded-3"
              onClick={onBack || (() => navigate(backTo, { replace: true }))}
              aria-label={backLabel}
            >
              {backLabel}
            </Button>
          </div>
        )}
      </Container>
    );
  }

  return <>{children}</>;
};
