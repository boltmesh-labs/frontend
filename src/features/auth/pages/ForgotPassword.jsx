import { Alert, Button, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';

import logo from '@/assets/logo2.png';
import { AuthContainer } from '@/features/auth/components/AuthContainer';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useForgotPassword } from '@/features/auth/hooks/useAuthMutations';
import { useForm } from '@/hooks/useForm';
import { COMPANY_NAME } from '@/utils/config';
import { getApiError } from '@/utils/errorHandler';

const SUCCESS_MESSAGE = 'Password reset instructions have been sent to your email.';

const ForgotPassword = () => {
  const { values, handleChange, setValue } = useForm({ email: '' });
  const { mutate: forgotPassword, isPending, isError, error, isSuccess } = useForgotPassword();

  usePageTitle(
    `Reset Password | ${COMPANY_NAME}`,
    `Request a password reset link for your ${COMPANY_NAME} account.`
  );

  const handleSubmit = (e) => {
    e.preventDefault();

    forgotPassword(values.email.trim(), {
      onSuccess: () => {
        setValue('email', '');
      },
    });
  };

  return (
    <AuthContainer>
      <div className="text-center mb-4">
        <img src={logo} alt={`${COMPANY_NAME} Logo`} width={100} className="mb-3" />
        <h2 className="fw-bold text-body">Forgot Password</h2>
        <p className="text-muted small">
          Enter your email address below and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3 text-start" controlId="email">
          <Form.Label className="fw-bold small text-muted">Email Address</Form.Label>
          <Form.Control
            type="email"
            name="email"
            placeholder="name@example.com"
            value={values.email}
            onChange={handleChange}
            required
            autoFocus
            autoComplete="email"
            disabled={isPending}
          />
        </Form.Group>

        {isError && (
          <Alert variant="danger" className="py-2 px-3 small border-0 shadow-sm">
            {getApiError(error, 'An error occurred. Please try again.')}
          </Alert>
        )}

        {isSuccess && (
          <Alert variant="success" className="py-2 px-3 small border-0 shadow-sm">
            {SUCCESS_MESSAGE}
          </Alert>
        )}

        <div className="d-grid mb-3">
          <Button
            type="submit"
            variant="primary"
            className="fw-bold py-2 shadow-sm"
            disabled={isPending}
          >
            {isPending ? 'Sending Link...' : 'Send Reset Link'}
          </Button>
        </div>
      </Form>

      <div className="text-center small text-muted">
        Remember your password?{' '}
        <Link to="/login" className="text-primary text-decoration-none fw-bold">
          Back to Login
        </Link>
      </div>
    </AuthContainer>
  );
};

export default ForgotPassword;
