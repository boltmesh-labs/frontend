import { Navigate } from 'react-router-dom';

import { PageLoader } from '@/components/PageLoader';
import { useAuth } from '@/features/auth/context/AuthContext';

const PublicRoute = ({ children, redirectOnAuth = true }) => {
  const { accessToken, loading } = useAuth();

  if (loading) {
    return <PageLoader message="Loading..." />;
  }

  // Redirect authenticated users to dashboard from public auth pages.
  // Pages that handle their own post-auth navigation (Login, OAuthCallback)
  // pass redirectOnAuth={false} so their destination redirect is not overridden.
  if (accessToken && redirectOnAuth) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PublicRoute;
