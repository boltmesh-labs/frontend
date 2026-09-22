import { useState } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import logo from '@/assets/logo2.png';
import { AuthContainer } from '@/features/auth/components/AuthContainer';
import { useResetPassword } from '@/features/auth/hooks/useAuthMutations';
import { useForm } from '@/hooks/useForm';
import { usePageTitle } from '@/hooks/usePageTitle';
import { COMPANY_NAME } from '@/utils/config';
import { getApiError } from '@/utils/errorHandler';

const DEFAULT_SUCCESS_MESSAGE = 'Password changed successfully! Redirecting to login...';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const { values, handleChange } = useForm({ password: '', confirmPassword: '' });
  const { mutate: resetPassword, isPending, isError, error, isSuccess } = useResetPassword();
  const [successMessage, setSuccessMessage] = useState(null);
  const [validationError, setValidationError] = useState(null);

  usePageTitle(
    `Reset Password | ${COMPANY_NAME}`,
    `Create a new password for your ${COMPANY_NAME} account.`
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError(null);

    if (!token) return;

    // Validate that passwords match before sending API request
    if (values.password !== values.confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    resetPassword(
      { token, password: values.password },
      {
        onSuccess: (data) => {
          setSuccessMessage(data?.detail || DEFAULT_SUCCESS_MESSAGE);

          // Wait 2 seconds so the user can read the success message before redirecting
          setTimeout(() => {
            navigate('/login');
          }, 1500);
        },
      }
    );
  };

  return (
    <AuthContainer>
      <div className="text-center mb-4">
        <img src={logo} alt={`${COMPANY_NAME} Logo`} width={100} className="mb-3" />
        <h2 className="fw-bold text-body mb-1">Reset Password</h2>
        <p className="text-muted small">Enter your new secure password below.</p>
      </div>

      {!token && (
        <Alert variant="danger" className="py-2 px-3 small mb-3 border-0 shadow-sm fw-medium">
          ⚠️ Warning: No valid reset token found in your link URL.
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3 text-start" controlId="password">
          <Form.Label className="small fw-medium text-secondary">New Password</Form.Label>
          <Form.Control
            type="password"
            name="password"
            placeholder="Minimum 8 characters"
            value={values.password}
            onChange={handleChange}
            required
            disabled={isPending || !token}
            autoComplete="new-password"
            autoFocus
          />
        </Form.Group>

        <Form.Group className="mb-4 text-start" controlId="confirmPassword">
          <Form.Label className="small fw-medium text-secondary">Confirm Password</Form.Label>
          <Form.Control
            type="password"
            name="confirmPassword"
            placeholder="Re-enter your new password"
            value={values.confirmPassword}
            onChange={handleChange}
            required
            disabled={isPending || !token}
            autoComplete="new-password"
          />
        </Form.Group>

        {validationError && (
          <Alert variant="danger" className="py-2 px-3 small mb-3 border-0 shadow-sm">
            {validationError}
          </Alert>
        )}

        {isError && (
          <Alert variant="danger" className="py-2 px-3 small mb-3 border-0 shadow-sm">
            {getApiError(
              error,
              'Something went wrong. Please try again or request a new reset link.'
            )}
          </Alert>
        )}

        {(isSuccess || successMessage) && !isPending && (
          <Alert variant="success" className="py-2 px-3 small mb-3 border-0 shadow-sm">
            {successMessage || DEFAULT_SUCCESS_MESSAGE}
          </Alert>
        )}

        <div className="d-grid mb-3">
          <Button
            type="submit"
            variant="primary"
            className="py-2 fw-bold shadow-sm"
            disabled={isPending || !token}
          >
            {isPending ? 'Saving Password...' : 'Reset Password'}
          </Button>
        </div>
      </Form>

      <div className="text-center small">
        <span className="text-muted">Remember your password? </span>
        <Link to="/login" className="text-decoration-none fw-bold">
          Login
        </Link>
      </div>
    </AuthContainer>
  );
};

export default ResetPassword;
