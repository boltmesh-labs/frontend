import { useEffect, useRef, useState } from 'react';
import { Alert, Card, Container, Spinner } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/context/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useActivateAccount } from '@/features/auth/hooks/useAuthMutations';
import { COMPANY_NAME } from '@/utils/config';

const ActivateAccount = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { setAccessToken } = useAuth();

  const [isLoading, setIsLoading] = useState(() => Boolean(token));
  const [alert, setAlert] = useState(() => {
    if (!token) {
      return {
        variant: 'danger',
        message: '❌ Invalid activation link. The verification token is missing.',
      };
    }
    return {
      variant: 'info',
      message: 'Verifying your link...',
    };
  });

  const timerRef = useRef(null);
  const activationPromiseRef = useRef(null);

  usePageTitle(
    `Account Activation | ${COMPANY_NAME}`,
    `Verify and activate your account to access ${COMPANY_NAME} services.`
  );

  const { mutateAsync: activateAccount } = useActivateAccount();

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!token) return;

    let isActive = true;

    const verifyAccount = async () => {
      try {
        // Pass the bare token: the mutation's queryFn wraps it as `{ token }`
        // itself - passing an object would post a nested payload and fail validation.
        if (!activationPromiseRef.current) {
          activationPromiseRef.current = activateAccount(token);
        }
        const response = await activationPromiseRef.current;
        if (!isActive) return;

        const { access_token } = response;
        setAlert({
          variant: 'success',
          message: '✅ Account activated! Redirecting to dashboard...',
        });

        timerRef.current = setTimeout(() => {
          if (access_token) {
            setAccessToken(access_token);
          }
          navigate('/dashboard', { replace: true });
        }, 2500);
      } catch (error) {
        if (!isActive) return;

        const status = error?.response?.status;
        const detail = error?.response?.data?.detail || 'The link is either invalid or expired.';

        if (status === 409) {
          setAlert({
            variant: 'warning',
            message: '⚠️ Account is already activated. Redirecting...',
          });
        } else {
          setAlert({
            variant: 'danger',
            message: `❌ ${detail}`,
          });
        }

        timerRef.current = setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 2500);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void verifyAccount();

    return () => {
      isActive = false;
    };
  }, [token, navigate, setAccessToken, activateAccount]);

  return (
    <Container className="d-flex align-items-center justify-content-center min-vh-75">
      <Card className="p-4 shadow-sm text-center border-0 w-100 max-w-480">
        <h3 className="mb-4 text-body fw-bold">Account Verification</h3>

        {isLoading ? (
          <div className="py-4">
            <Spinner animation="border" variant="primary" className="mb-3" />
            <p className="text-muted mb-0">Verifying your link...</p>
          </div>
        ) : (
          <Alert variant={alert.variant} className="mb-0 border-0 shadow-sm">
            {alert.message}
          </Alert>
        )}
      </Card>
    </Container>
  );
};

export default ActivateAccount;
