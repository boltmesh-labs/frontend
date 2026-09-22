import { useEffect, useRef, useState } from 'react';
import { Alert, Card, Container, Spinner } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useConfirmAccountDeletion } from '@/features/auth/hooks/useAuthMutations';
import { usePageTitle } from '@/hooks/usePageTitle';
import { COMPANY_NAME } from '@/utils/config';
import { getApiError } from '@/utils/errorHandler';

const REDIRECT_DELAY_MS = 2500;
const DEFAULT_FAILURE_MESSAGE = 'The link is either invalid or expired.';

const ConfirmDelete = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorDetail, setErrorDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(token));

  const timerRef = useRef(null);
  const hasExecutedRef = useRef(false);

  usePageTitle(
    `Confirm Account Deletion | ${COMPANY_NAME}`,
    'Confirm the permanent deletion of your account.'
  );

  const { mutate: confirmDeletion } = useConfirmAccountDeletion();

  useEffect(() => {
    if (!token || hasExecutedRef.current) return;

    hasExecutedRef.current = true;

    confirmDeletion(token, {
      onSuccess: () => {
        setSuccessMessage('Your account has been deleted. Redirecting to login...');
      },
      onError: (error) => {
        // Surface the backend's detail (e.g. "link expired") with the original
        // generic copy as fallback.
        setErrorDetail(getApiError(error, DEFAULT_FAILURE_MESSAGE));
      },
      onSettled: () => {
        setIsLoading(false);
      },
    });
  }, [token, confirmDeletion]);

  useEffect(() => {
    if (isLoading) return;

    timerRef.current = setTimeout(() => {
      navigate('/login', { replace: true });
    }, REDIRECT_DELAY_MS);

    return () => clearTimeout(timerRef.current);
  }, [isLoading, navigate]);

  const isProcessing = Boolean(token) && isLoading;

  const alertVariant = successMessage ? 'success' : 'danger';
  const alertMessage = successMessage
    ? `✅ ${successMessage}`
    : token
      ? `❌ ${errorDetail || DEFAULT_FAILURE_MESSAGE}`
      : '❌ Invalid link. The deletion confirmation token is missing.';

  return (
    <Container className="d-flex align-items-center justify-content-center min-vh-75">
      <Card className="p-4 shadow-sm text-center border-0 w-100 max-w-480">
        <h3 className="mb-4 text-body fw-bold">Confirm Account Deletion</h3>

        {isProcessing ? (
          <div className="py-4">
            <Spinner animation="border" variant="primary" className="mb-3" />
            <p className="text-muted mb-0">Confirming your account deletion...</p>
          </div>
        ) : (
          <Alert variant={alertVariant} className="mb-0 border-0 shadow-sm">
            {alertMessage}
          </Alert>
        )}
      </Card>
    </Container>
  );
};

export default ConfirmDelete;
