import React, { Suspense, useState } from 'react';
import { Button, Container } from 'react-bootstrap';
import { BrowserRouter, Link, Navigate, useRoutes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { AuthProvider } from '@/features/auth/context/AuthProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import { PageLoader } from '@/components/PageLoader';
import ProtectedRoute from '@/features/auth/components/ProtectedRoute';
import PublicRoute from '@/features/auth/components/PublicRoute';
import { USER_ROLES } from '@/constants/roles';

import MainLayout from '@/layouts/MainLayout';
const AdminLayout = React.lazy(() => import('@/features/admin/layouts/AdminLayout'));

// Auth Pages
const Login = React.lazy(() => import('@/features/auth/pages/Login'));
const Register = React.lazy(() => import('@/features/auth/pages/Register'));
const ForgotPassword = React.lazy(() => import('@/features/auth/pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('@/features/auth/pages/ResetPassword'));
const ActivateAccount = React.lazy(() => import('@/features/auth/pages/ActivateAccount'));
const ConfirmDelete = React.lazy(() => import('@/features/auth/pages/ConfirmDelete'));
const Unauthorized = React.lazy(() => import('@/features/auth/pages/Unauthorized'));
const OAuthCallback = React.lazy(() => import('@/features/auth/pages/OAuthCallback'));

// Dashboard Pages
const Dashboard = React.lazy(() => import('@/features/dashboard/pages/Dashboard'));
const BuyPlan = React.lazy(() => import('@/features/dashboard/pages/BuyPlan'));
const Checkout = React.lazy(() => import('@/features/dashboard/pages/Checkout'));
const UserInvoiceList = React.lazy(() => import('@/features/dashboard/pages/InvoiceList'));
const UserInvoiceDetail = React.lazy(() => import('@/features/dashboard/pages/InvoiceDetail'));
const Payment = React.lazy(() => import('@/features/dashboard/pages/Payment'));
const AccountSettings = React.lazy(() => import('@/features/dashboard/pages/AccountSettings'));
const UserDeviceList = React.lazy(() => import('@/features/dashboard/pages/DeviceList'));
const UserSubscriptionList = React.lazy(
  () => import('@/features/dashboard/pages/SubscriptionList')
);
const UserSubscriptionDetail = React.lazy(
  () => import('@/features/dashboard/pages/SubscriptionDetail')
);

// Support & Legal Pages
const Contact = React.lazy(() => import('@/features/support/pages/Contact'));
const TermsOfService = React.lazy(() => import('@/features/legal/pages/TermsOfService'));
const PrivacyPolicy = React.lazy(() => import('@/features/legal/pages/PrivacyPolicy'));

// Admin Pages
const UserList = React.lazy(() => import('@/features/admin/pages/UserList'));
const UserDetail = React.lazy(() => import('@/features/admin/pages/UserDetail'));
const PlanList = React.lazy(() => import('@/features/admin/pages/PlanList'));
const PlanDetail = React.lazy(() => import('@/features/admin/pages/PlanDetail'));
const InvoiceList = React.lazy(() => import('@/features/admin/pages/InvoiceList'));
const InvoiceDetail = React.lazy(() => import('@/features/admin/pages/InvoiceDetail'));
const PaymentList = React.lazy(() => import('@/features/admin/pages/PaymentList'));
const PaymentDetail = React.lazy(() => import('@/features/admin/pages/PaymentDetail'));
const SubscriptionList = React.lazy(() => import('@/features/admin/pages/SubscriptionList'));
const SubscriptionDetail = React.lazy(() => import('@/features/admin/pages/SubscriptionDetail'));
const VpnServerList = React.lazy(() => import('@/features/admin/pages/VpnServerList'));
const VpnServerDetail = React.lazy(() => import('@/features/admin/pages/VpnServerDetail'));
const VpnDeviceList = React.lazy(() => import('@/features/admin/pages/VpnDeviceList'));
const VpnDeviceDetail = React.lazy(() => import('@/features/admin/pages/VpnDeviceDetail'));
const VpnPeerDetail = React.lazy(() => import('@/features/admin/pages/VpnPeerDetail'));
const VpnRegionList = React.lazy(() => import('@/features/admin/pages/VpnRegionList'));
const VpnRegionDetail = React.lazy(() => import('@/features/admin/pages/VpnRegionDetail'));
const VpnServerAuditList = React.lazy(() => import('@/features/admin/pages/VpnServerAuditList'));

// Factory instead of a module-level singleton: tests that render <App/> get
// a fresh cache and can never leak query state into one another.
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 10,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });

const NotFound = () => (
  <Container className="d-flex flex-column align-items-center justify-content-center text-center py-5">
    <h1 className="display-3 fw-bold text-body-secondary mb-2">404</h1>
    <p className="text-body-secondary mb-4">The page you are looking for does not exist.</p>
    <Button as={Link} to="/" variant="primary" className="fw-bold px-4">
      Back to Home
    </Button>
  </Container>
);

// Route-guard flavors understood by withAuth(); centralizes the magic strings
// previously scattered through the route table.
const GUARD_TYPES = {
  PUBLIC: 'public',
  PROTECTED: 'protected',
};

const withAuth = (element, guardType, role, guardProps = {}) => {
  let content = (
    <Suspense fallback={<PageLoader fullscreen={false} className="py-5" />}>{element}</Suspense>
  );

  if (guardType === GUARD_TYPES.PUBLIC) {
    return <PublicRoute {...guardProps}>{content}</PublicRoute>;
  }
  if (guardType === GUARD_TYPES.PROTECTED) {
    return <ProtectedRoute requiredRole={role}>{content}</ProtectedRoute>;
  }
  return content;
};

// Per-page Suspense boundary for lazy admin children: without it a loading
// child chunk suspends past AdminLayout up to withAuth's boundary, replacing
// the whole layout (sidebar included) with the loader on every first visit.
const lazyPane = (element) => (
  <Suspense fallback={<PageLoader fullscreen={false} className="py-5" />}>{element}</Suspense>
);

const routesConfig = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },

      // Public Routes
      {
        path: 'login',
        element: withAuth(<Login />, GUARD_TYPES.PUBLIC, null, { redirectOnAuth: false }),
      },
      { path: 'register', element: withAuth(<Register />, GUARD_TYPES.PUBLIC) },
      { path: 'forgot-password', element: withAuth(<ForgotPassword />, GUARD_TYPES.PUBLIC) },
      { path: 'reset-password', element: withAuth(<ResetPassword />, GUARD_TYPES.PUBLIC) },
      {
        path: 'auth/callback',
        element: withAuth(<OAuthCallback />, GUARD_TYPES.PUBLIC, null, { redirectOnAuth: false }),
      },

      // Static / Informational
      { path: 'unauthorized', element: withAuth(<Unauthorized />) },
      { path: 'terms', element: withAuth(<TermsOfService />) },
      { path: 'privacy-policy', element: withAuth(<PrivacyPolicy />) },
      { path: 'contact', element: withAuth(<Contact />) },
      // redirectOnAuth: false — a logged-in user opening a fresh activation or
      // deletion link must reach these token-consuming pages; the default
      // public-route redirect would silently bounce them to /dashboard first.
      {
        path: 'verify-email',
        element: withAuth(<ActivateAccount />, GUARD_TYPES.PUBLIC, null, { redirectOnAuth: false }),
      },
      {
        path: 'confirm-delete',
        element: withAuth(<ConfirmDelete />, GUARD_TYPES.PUBLIC, null, { redirectOnAuth: false }),
      },

      // User Routes
      { path: 'dashboard', element: withAuth(<Dashboard />, GUARD_TYPES.PROTECTED) },
      { path: 'buy-plan', element: withAuth(<BuyPlan />, GUARD_TYPES.PROTECTED) },
      { path: 'checkout/:planId', element: withAuth(<Checkout />, GUARD_TYPES.PROTECTED) },
      { path: 'invoices', element: withAuth(<UserInvoiceList />, GUARD_TYPES.PROTECTED) },
      { path: 'invoices/:id', element: withAuth(<UserInvoiceDetail />, GUARD_TYPES.PROTECTED) },
      { path: 'payment/:invoiceId', element: withAuth(<Payment />, GUARD_TYPES.PROTECTED) },
      { path: 'account-settings', element: withAuth(<AccountSettings />, GUARD_TYPES.PROTECTED) },
      { path: 'devices', element: withAuth(<UserDeviceList />, GUARD_TYPES.PROTECTED) },
      { path: 'subscriptions', element: withAuth(<UserSubscriptionList />, GUARD_TYPES.PROTECTED) },
      {
        path: 'subscriptions/:id',
        element: withAuth(<UserSubscriptionDetail />, GUARD_TYPES.PROTECTED),
      },

      // Admin Area
      {
        path: 'admin',
        element: withAuth(<AdminLayout />, GUARD_TYPES.PROTECTED, USER_ROLES.admin),
        children: [
          { index: true, element: <Navigate to="users" replace /> },
          { path: 'users', element: lazyPane(<UserList />) },
          { path: 'users/:id', element: lazyPane(<UserDetail />) },
          { path: 'plans', element: lazyPane(<PlanList />) },
          { path: 'plans/:id', element: lazyPane(<PlanDetail />) },
          { path: 'invoices', element: lazyPane(<InvoiceList />) },
          { path: 'invoices/:id', element: lazyPane(<InvoiceDetail />) },
          { path: 'payments', element: lazyPane(<PaymentList />) },
          { path: 'payments/:id', element: lazyPane(<PaymentDetail />) },
          { path: 'subscriptions', element: lazyPane(<SubscriptionList />) },
          { path: 'subscriptions/:id', element: lazyPane(<SubscriptionDetail />) },
          { path: 'vpn-servers', element: lazyPane(<VpnServerList />) },
          { path: 'vpn-servers/audit', element: lazyPane(<VpnServerAuditList />) },
          { path: 'vpn-servers/:id', element: lazyPane(<VpnServerDetail />) },
          { path: 'vpn-devices/peer/:id', element: lazyPane(<VpnPeerDetail />) },
          { path: 'vpn-devices', element: lazyPane(<VpnDeviceList />) },
          { path: 'vpn-devices/:id', element: lazyPane(<VpnDeviceDetail />) },
          { path: 'vpn-regions', element: lazyPane(<VpnRegionList />) },
          { path: 'vpn-regions/:id', element: lazyPane(<VpnRegionDetail />) },
        ],
      },

      // Unknown URLs render a real 404 inside the layout instead of bouncing
      // authenticated users back through /login.
      { path: '*', element: withAuth(<NotFound />) },
    ],
  },
];

function AppRoutes() {
  return useRoutes(routesConfig);
}

function App() {
  // useState initializer keeps one stable client per mounted App instance.
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
            <ToastContainer autoClose={2000} theme="colored" />
            <AppRoutes />
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
      {/* Dev-only: keep the query cache inspector out of production bundles */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;
