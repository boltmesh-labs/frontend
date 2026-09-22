import { useEffect, useRef, useState } from 'react';
import { Alert, Spinner } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { apiClient } from '@/api/client';
import { AuthContainer } from '@/features/auth/components/AuthContainer';
import { useAuth } from '@/features/auth/context/AuthContext';
import { OAUTH_REDIRECT_FROM_KEY, sanitizeRedirectPath } from '@/utils/config';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setAccessToken } = useAuth();
  // Token consumption must happen exactly once per page load. This guard keeps
  // StrictMode's dev double-mount from re-processing, but it also suppresses
  // any future effect re-runs — the deps below must stay stable forever.
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const processOAuth = async () => {
      // The backend establishes the session via HttpOnly refresh cookie and
      // redirects bare to /auth/callback; the SPA obtains its in-memory
      // access token with a silent refresh. No credential is accepted from
      // the URL: ?token= / ?access_token= would reintroduce server/proxy/
      // Referer leak vectors, and #token= fragments are no longer emitted.
      const errDetail = searchParams.get('error');

      if (errDetail) {
        setError(decodeURIComponent(errDetail));
        return;
      }

      // Written by Login before the provider redirect; passed through
      // sanitizeRedirectPath because sessionStorage contents should never be
      // trusted blindly as a navigation target.
      const targetPath = sanitizeRedirectPath(sessionStorage.getItem(OAUTH_REDIRECT_FROM_KEY));

      const finish = (token) => {
        // Clean temporary oauth session keys
        sessionStorage.removeItem(OAUTH_REDIRECT_FROM_KEY);

        // Session persistence is handled by the backend refresh-token cookie;
        // the access token is only kept in memory (AuthContext + api module).
        setAccessToken(token);

        // Sanitize URL by removing query string
        window.history.replaceState({}, document.title, window.location.pathname);

        navigate(targetPath, { replace: true });
      };

      try {
        const { data } = await apiClient.authApi.post('/auth/refresh-token');
        if (!data?.access_token) {
          setError('Authentication failed. No access token was received.');
          return;
        }
        finish(data.access_token);
      } catch {
        setError('Authentication failed. No access token was received.');
      }
    };

    processOAuth();
  }, [searchParams, navigate, setAccessToken]);

  return (
    <AuthContainer>
      <div className="text-center py-4">
        {error ? (
          <>
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/login', { replace: true })}
            >
              Return to Login
            </button>
          </>
        ) : (
          <>
            <Spinner animation="border" variant="primary" className="mb-3" />
            <h5>Completing social authentication...</h5>
            <p className="text-muted small">Please wait while we log you in.</p>
          </>
        )}
      </div>
    </AuthContainer>
  );
};

export default OAuthCallback;
