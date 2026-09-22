import { Navigate, useLocation } from 'react-router-dom';

import { PageLoader } from '@/components/PageLoader';
import { useAuth } from '@/features/auth/context/AuthContext';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { accessToken, user, loading } = useAuth();
  const location = useLocation();

  // 1. Initial Auth State Loading Gate
  if (loading) {
    return <PageLoader message="Verifying session..." />;
  }

  // 2. Authentication Check: Redirect to login if unauthenticated
  if (!accessToken || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Authorization Check: Validate user role if required
  if (requiredRole) {
    const isAuthorized = Array.isArray(requiredRole)
      ? requiredRole.includes(user?.role)
      : user?.role === requiredRole;

    if (!isAuthorized) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
