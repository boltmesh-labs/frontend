import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, Col, Row } from 'react-bootstrap';
import { PageLoader } from '@/components/PageLoader';
import { AsyncButton } from '@/components/AsyncButton';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useCountdown } from '@/hooks/useCountdown';
import { useDashboardProfile, useResendActivation } from '@/features/dashboard/hooks/useDashboard';
import { DashboardContainer } from '@/features/dashboard/components/DashboardContainer';
import { COMPANY_NAME } from '@/utils/config';

const ActivationWarning = ({ onResend, isLoading }) => (
  <Card className="border-warning bg-warning bg-opacity-10 mt-3">
    <Card.Body className="p-3 text-start">
      <p className="text-warning small mb-2 fw-bold">⚠️ Account Status: Needs Verification</p>
      <p className="text-body-secondary small mb-3">
        Please verify your email address to unlock your VPN access capabilities.
      </p>
      <AsyncButton
        variant="warning"
        className="w-100 fw-bold text-body shadow-sm py-2"
        onClick={onResend}
        loading={isLoading}
        loadingLabel="Sending Email..."
      >
        Resend Verification Email
      </AsyncButton>
    </Card.Body>
  </Card>
);

const PlanInfo = ({ plan, expiresAt, isVerified, onChangePlan, onResend, resendLoading }) => {
  // useCountdown owns the ticking clock (one tick per minute is plenty for an
  // expiry banner) instead of a hand-rolled Date.now() interval here.
  const hasExpiry = Boolean(expiresAt);
  const { remainingMs, expired } = useCountdown(hasExpiry ? expiresAt : null, {
    intervalMs: 60000,
  });

  const isExpired = hasExpiry && expired;
  const isAboutToExpire =
    !isExpired && hasExpiry && remainingMs > 0 && remainingMs <= 7 * 24 * 60 * 60 * 1000;
  const ts = hasExpiry ? new Date(expiresAt).getTime() : null;

  const prevStateRef = useRef(null);

  useEffect(() => {
    const stateKey = isExpired ? 'expired' : isAboutToExpire ? 'about-to-expire' : 'ok';

    if (prevStateRef.current === null) {
      prevStateRef.current = stateKey;
      return;
    }
    if (prevStateRef.current === stateKey) return;

    prevStateRef.current = stateKey;
    if (isExpired) {
      toast.error('Your subscription has expired.', { toastId: 'expired-alert' });
    } else if (isAboutToExpire) {
      toast.warn('Your subscription expires soon.', { toastId: 'expiry-warn' });
    }
  }, [isExpired, isAboutToExpire]);

  if (!plan) {
    return (
      <Card className="mt-4 border-0 shadow-sm bg-body-tertiary">
        <Card.Body className="p-4 text-center">
          <p className="text-body-secondary mb-3">You do not have an active VPN plan.</p>
          <Button
            variant="primary"
            onClick={onChangePlan}
            disabled={!isVerified}
            className="w-100 py-2 fw-bold shadow-sm"
          >
            Choose a VPN Plan
          </Button>
          {!isVerified && <ActivationWarning onResend={onResend} isLoading={resendLoading} />}
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mt-4 border-0 shadow-sm bg-body-tertiary">
      <Card.Body className="p-4 text-start">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span className="text-body-secondary small fw-bold text-uppercase tracking-wider">
            Current Plan
          </span>
          <Badge bg={isExpired ? 'danger' : 'success'} className="px-3 py-2">
            {isExpired ? 'Expired' : 'Active'}
          </Badge>
        </div>

        <h4 className="fw-bold text-body-emphasis mb-1">{plan.name}</h4>

        {ts ? (
          <p
            className={`small mb-4 ${
              isExpired || isAboutToExpire ? 'text-danger fw-bold' : 'text-body-secondary'
            }`}
          >
            📅 Expiration Date: {new Date(expiresAt).toLocaleDateString()}
          </p>
        ) : (
          <p className="small text-body-secondary mb-4">Lifetime Account Access</p>
        )}

        <Button
          variant="primary"
          onClick={onChangePlan}
          disabled={!isVerified}
          className="w-100 py-2 fw-bold shadow-sm"
        >
          {isExpired ? 'Renew Subscription' : 'Change Plan'}
        </Button>

        {!isVerified && <ActivationWarning onResend={onResend} isLoading={resendLoading} />}
      </Card.Body>
    </Card>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();

  usePageTitle(
    `Dashboard | ${COMPANY_NAME}`,
    `Manage your ${COMPANY_NAME} subscription, devices, and active VPN configuration.`
  );

  const { data: user, isLoading, isError } = useDashboardProfile();
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (isError) {
      toast.error('Unable to load profile. Please refresh.');
    }
  }, [isError]);

  const resendMutation = useResendActivation();

  const handleResendActivation = async () => {
    setResendLoading(true);
    try {
      await resendMutation.mutateAsync();
    } catch {
      // Feedback (the toast) is owned by useResendActivation's onError; the
      // rejection is only contained here so it isn't an unhandled promise, and
      // the page does NOT call handleApiError again (which used to double-toast).
    } finally {
      setResendLoading(false);
    }
  };

  // Current subscription computed by the backend (UserDetailOut.active_subscription).
  // Only populated when there is an active/grace-period subscription that hasn't expired yet.
  const activeSubscription = user?.active_subscription || null;

  if (isLoading) {
    return (
      <DashboardContainer>
        <PageLoader fullscreen={false} className="py-5" />
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <div className="text-center mb-4 border-bottom pb-3">
        <h2 className="fw-bold text-body-emphasis mb-1">Account Dashboard</h2>
        <p className="text-body-secondary small mb-0">Manage your VPN profile and settings.</p>
      </div>

      {user && (
        <>
          <Card className="border-0 p-3 bg-body-tertiary shadow-sm rounded-3 mb-3 text-start">
            <div className="d-flex align-items-center gap-3 min-w-0">
              <div
                className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold fs-5 flex-shrink-0"
                style={{ width: 44, height: 44 }}
              >
                {user.username?.[0]?.toUpperCase() || 'U'}
              </div>

              <Row className="g-2 flex-grow-1 min-w-0">
                <Col xs={12} sm={6}>
                  <span className="text-body-secondary small d-block">Username</span>
                  <strong className="text-body-emphasis">{user.username}</strong>
                </Col>
                <Col xs={12} sm={6}>
                  <span className="text-body-secondary small d-block">Email Address</span>
                  <span className="text-body-emphasis font-monospace text-truncate d-block">
                    {user.email}
                  </span>
                </Col>
              </Row>
            </div>
          </Card>

          <PlanInfo
            plan={activeSubscription?.plan}
            expiresAt={activeSubscription?.expires_at}
            isVerified={user.is_verified}
            onChangePlan={() => navigate('/buy-plan')}
            onResend={handleResendActivation}
            resendLoading={resendLoading || resendMutation.isPending}
          />

          <div className="mt-4 d-flex flex-column gap-3">
            {/* Quick-nav cards render as real links so they are keyboard reachable. */}
            <Card
              as={Link}
              to="/subscriptions"
              className="border-0 shadow-sm bg-body-tertiary text-start text-decoration-none"
            >
              <Card.Body className="p-3 d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3 min-w-0">
                  <div className="fs-4 p-2">📅</div>
                  <div>
                    <h6 className="fw-bold text-body-emphasis mb-0">Subscriptions</h6>
                    <p className="text-body-secondary small mb-0">
                      View active subscriptions, auto-renewal settings, and billing cycles.
                    </p>
                  </div>
                </div>
                <span className="text-body-secondary fw-bold fs-5 flex-shrink-0">➔</span>
              </Card.Body>
            </Card>

            <Card
              {...(activeSubscription?.plan ? { as: Link, to: '/devices' } : {})}
              className={`border-0 shadow-sm text-start text-decoration-none ${
                activeSubscription?.plan
                  ? 'bg-success bg-opacity-10 border-start border-4 border-success'
                  : 'bg-body-tertiary opacity-75'
              }`}
            >
              <Card.Body className="p-3 d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3 min-w-0">
                  <div className="fs-4 p-2">📱</div>
                  <div>
                    <h6 className="fw-bold text-body-emphasis mb-0">VPN Devices</h6>
                    <p className="text-body-secondary small mb-0">
                      {activeSubscription?.plan
                        ? 'Manage your connected devices, QR codes, and WireGuard keys.'
                        : 'Requires an active VPN subscription plan.'}
                    </p>
                  </div>
                </div>
                {activeSubscription?.plan && (
                  <span className="text-body-secondary fw-bold fs-5 flex-shrink-0">➔</span>
                )}
              </Card.Body>
            </Card>

            <Card
              as={Link}
              to="/invoices"
              className="border-0 shadow-sm bg-body-tertiary text-start text-decoration-none"
            >
              <Card.Body className="p-3 d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3 min-w-0">
                  <div className="fs-4 p-2">📄</div>
                  <div>
                    <h6 className="fw-bold text-body-emphasis mb-0">Billing & Invoices</h6>
                    <p className="text-body-secondary small mb-0">
                      Review payment receipts and transaction history.
                    </p>
                  </div>
                </div>
                <span className="text-body-secondary fw-bold fs-5 flex-shrink-0">➔</span>
              </Card.Body>
            </Card>

            <Card
              as={Link}
              to="/account-settings"
              className="border-0 shadow-sm bg-body-tertiary text-start text-decoration-none"
            >
              <Card.Body className="p-3 d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3 min-w-0">
                  <div className="fs-4 p-2">👤</div>
                  <div>
                    <h6 className="fw-bold text-body-emphasis mb-0">Account Settings</h6>
                    <p className="text-body-secondary small mb-0">
                      Update your password, profile information, and preferences.
                    </p>
                  </div>
                </div>
                <span className="text-body-secondary fw-bold fs-5 flex-shrink-0">➔</span>
              </Card.Body>
            </Card>
          </div>

          <div className="border-top my-4"></div>
          <div className="small text-end">
            <a
              href="https://www.wireguard.com/install/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-decoration-none fw-medium"
            >
              Download WireGuard Client
            </a>
          </div>
        </>
      )}
    </DashboardContainer>
  );
};

export default Dashboard;
