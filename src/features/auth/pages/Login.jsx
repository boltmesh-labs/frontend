import { useState } from 'react';
import { Alert, Button, Form, InputGroup } from 'react-bootstrap';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub, FaEye, FaEyeSlash } from 'react-icons/fa6';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import logo from '@/assets/logo2.png';
import { AuthContainer } from '@/features/auth/components/AuthContainer';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useLogin } from '@/features/auth/hooks/useAuthMutations';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useForm } from '@/hooks/useForm';
import {
  API_BASE_URL,
  COMPANY_NAME,
  OAUTH_REDIRECT_FROM_KEY,
  sanitizeRedirectPath,
} from '@/utils/config';
import { getApiError } from '@/utils/errorHandler';

const Login = () => {
  // Shared controlled-form helper for field values; purely visual state such
  // as password visibility stays in local useState.
  const { values, handleChange } = useForm({
    username: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginSubmitted, setLoginSubmitted] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { setAccessToken, accessToken } = useAuth();

  const { mutate: login, isPending, isError, error } = useLogin();

  usePageTitle(`Login | ${COMPANY_NAME}`, `Sign in to your ${COMPANY_NAME} account.`);

  // Router state is app-controlled, but the destination still passes through
  // sanitizeRedirectPath so a hand-crafted location.state cannot turn login
  // into an open redirect.
  const getDestinationPath = () => {
    const from = location.state?.from;
    if (typeof from === 'string') return sanitizeRedirectPath(from);
    if (from?.pathname) {
      return sanitizeRedirectPath(`${from.pathname}${from.search || ''}${from.hash || ''}`);
    }
    return '/dashboard';
  };

  const handleSocialLogin = (provider) => {
    const destination = getDestinationPath();
    sessionStorage.setItem(OAUTH_REDIRECT_FROM_KEY, destination);

    window.location.href = `${API_BASE_URL}/auth/${provider}?remember_me=${values.rememberMe}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    login(
      {
        username: values.username,
        password: values.password,
        remember_me: values.rememberMe,
      },
      {
        onSuccess: ({ access_token }) => {
          setLoginSubmitted(true);
          setAccessToken(access_token);
          navigate(getDestinationPath(), { replace: true });
        },
      }
    );
  };

  if (accessToken && !loginSubmitted) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AuthContainer>
      <div className="text-center mb-4">
        <img src={logo} alt={`${COMPANY_NAME} logo`} width={80} className="mb-2" />
        <h3 className="fw-bold text-body-emphasis">Sign In</h3>
        <p className="text-muted small">Enter your login details.</p>
      </div>

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3 text-start">
          <Form.Label className="small fw-semibold text-secondary">Username or Email</Form.Label>
          <Form.Control
            type="text"
            id="username"
            name="username"
            value={values.username}
            onChange={handleChange}
            placeholder="Enter username or email"
            required
            autoComplete="username"
            autoFocus
            disabled={isPending}
          />
        </Form.Group>

        <Form.Group className="mb-3 text-start">
          <div className="d-flex justify-content-between mb-1">
            <Form.Label className="small fw-semibold text-secondary mb-0">Password</Form.Label>
            <Link
              to="/forgot-password"
              tabIndex={isPending ? -1 : 0}
              className="small text-decoration-none"
            >
              Forgot?
            </Link>
          </div>
          <InputGroup>
            <Form.Control
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={values.password}
              onChange={handleChange}
              placeholder="Enter password"
              required
              autoComplete="current-password"
              disabled={isPending}
            />
            <Button
              variant="outline-secondary"
              onClick={() => setShowPassword((prev) => !prev)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              disabled={isPending}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </Button>
          </InputGroup>
        </Form.Group>

        {isError && (
          <Alert variant="danger" className="py-2 small">
            {getApiError(error, 'Login failed')}
          </Alert>
        )}

        <Form.Check
          type="checkbox"
          id="remember-me"
          label="Remember me"
          name="rememberMe"
          checked={values.rememberMe}
          onChange={handleChange}
          className="mb-3 text-start small"
          disabled={isPending}
        />

        <Button type="submit" variant="primary" className="w-100 py-2 fw-bold" disabled={isPending}>
          {isPending ? 'Logging in...' : 'Login'}
        </Button>
      </Form>

      <div className="text-center my-3 text-muted small">Or continue with</div>

      <div className="d-flex gap-2 mb-3">
        <Button
          type="button"
          variant="outline-secondary"
          className="w-100 d-flex align-items-center justify-content-center gap-2"
          onClick={() => handleSocialLogin('google')}
          disabled={isPending}
        >
          <FcGoogle size={18} /> Google
        </Button>
        <Button
          type="button"
          variant="outline-secondary"
          className="w-100 d-flex align-items-center justify-content-center gap-2"
          onClick={() => handleSocialLogin('github')}
          disabled={isPending}
        >
          <FaGithub size={18} /> GitHub
        </Button>
      </div>

      <p className="text-center small mb-0 text-secondary">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="fw-bold text-decoration-none">
          Register
        </Link>
      </p>
    </AuthContainer>
  );
};

export default Login;
