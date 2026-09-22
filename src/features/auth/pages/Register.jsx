import { useState } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';

import logo from '@/assets/logo2.png';
import { AuthContainer } from '@/features/auth/components/AuthContainer';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useRegister } from '@/features/auth/hooks/useAuthMutations';
import { useForm } from '@/hooks/useForm';
import { COMPANY_NAME } from '@/utils/config';
import { getApiError } from '@/utils/errorHandler';

const FORM_INITIAL = {
  username: '',
  email: '',
  password: '',
  passwordConfirmation: '',
  acceptTerms: false,
};

const FORM_FIELDS = [
  { id: 'username', label: 'Username', type: 'text', autoComplete: 'username' },
  { id: 'email', label: 'Email Address', type: 'email', autoComplete: 'email' },
  {
    id: 'password',
    label: 'Password',
    type: 'password',
    autoComplete: 'new-password',
  },
  {
    id: 'passwordConfirmation',
    label: 'Confirm Password',
    type: 'password',
    autoComplete: 'new-password',
  },
];

const SUCCESS_MESSAGE = 'Registration successful! Redirecting to login...';

const Register = () => {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const { values, handleChange } = useForm(FORM_INITIAL, { trimStart: true });
  const { mutate: register, isPending, isError, error, isSuccess } = useRegister();
  const [formError, setFormError] = useState('');

  usePageTitle(
    `Sign Up | ${COMPANY_NAME}`,
    `Create a new ${COMPANY_NAME} account to get started with secure VPN access.`
  );

  const validateEmail = (val) => /^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(val);

  const handleSubmit = (e) => {
    e.preventDefault();

    const { username, email, password, passwordConfirmation, acceptTerms } = values;

    if (!username || !email || !password || !passwordConfirmation) {
      setFormError('All fields are required.');
      return;
    }
    if (!validateEmail(email)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }
    if (password !== passwordConfirmation) {
      setFormError('Passwords do not match.');
      return;
    }
    if (!acceptTerms) {
      setFormError('You must agree to the Terms of Service.');
      return;
    }

    register(
      {
        username: username.trim(),
        email: email.trim(),
        password,
      },
      {
        onSuccess: () => {
          // Registration successful - redirect to login
          setFormError('');
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 1500);
        },
      }
    );
  };

  if (accessToken) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AuthContainer>
      <div className="text-center mb-4">
        <img src={logo} alt={`${COMPANY_NAME} Logo`} width={100} className="mb-3" />
        <h2 className="fw-bold text-body mb-1">Create Account</h2>
        <p className="text-muted small">Sign up below to get started.</p>
      </div>

      <Form onSubmit={handleSubmit}>
        {FORM_FIELDS.map((field) => (
          <Form.Group className="mb-3 text-start" controlId={field.id} key={field.id}>
            <Form.Label className="small fw-medium text-secondary">{field.label}</Form.Label>
            <Form.Control
              type={field.type}
              value={values[field.id]}
              onChange={handleChange}
              disabled={isPending}
              required
              autoComplete={field.autoComplete}
              autoFocus={field.id === 'username'}
              placeholder={`Enter your ${field.label.toLowerCase()}`}
            />
          </Form.Group>
        ))}

        <Form.Group className="mb-4 text-start" controlId="acceptTerms">
          <Form.Check type="checkbox">
            <Form.Check.Input
              id="acceptTerms"
              checked={values.acceptTerms}
              onChange={handleChange}
              disabled={isPending}
              required
            />
            <Form.Check.Label className="small text-muted ms-1">
              I agree to the{' '}
              <Link to="/terms" target="_blank" className="text-decoration-none fw-bold">
                Terms of Service
              </Link>
            </Form.Check.Label>
          </Form.Check>
        </Form.Group>

        {formError && (
          <Alert variant="danger" className="py-2 px-3 small border-0 shadow-sm">
            {formError}
          </Alert>
        )}

        {isError && (
          <Alert variant="danger" className="py-2 px-3 small border-0 shadow-sm">
            {getApiError(error, 'An unexpected error occurred. Please try again.')}
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
            {isPending ? 'Creating Account...' : 'Register Account'}
          </Button>
        </div>
      </Form>

      <div className="text-center small">
        <span className="text-muted">Already have an account? </span>
        <Link to="/login" className="text-decoration-none fw-bold">
          Login
        </Link>
      </div>
    </AuthContainer>
  );
};

export default Register;
