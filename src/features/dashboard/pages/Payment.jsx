import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Alert, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
import { PageLoader } from '@/components/PageLoader';
import { Link, useNavigate, useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { useQueryClient } from '@tanstack/react-query';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useCountdown } from '@/hooks/useCountdown';
import { useCopied } from '@/hooks/useCopied';
import { formatCurrencyAmount } from '@/utils/currencyFormatter';
import { invoiceStatusMessage } from '@/utils/statusMessages';
import { formatCountdown } from '@/utils/countdown';
import { copyToClipboard } from '@/utils/clipboard';
import { DashboardContainer } from '@/features/dashboard/components/DashboardContainer';
import { useUserInvoiceDetail, useInvoiceStatus, usePlanDetail } from '../hooks/useDashboard';
import { DashboardHeader } from '../components/DashboardHeader';
import { dashboardKeys } from '../api/queryKeys';
import { COMPANY_NAME } from '@/utils/config';
import { TERMINAL_INVOICE_STATUSES } from '@/constants/statuses';

const Payment = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // The invoice is always fetched by route param instead of being carried
  // through navigation state, so refreshes, shared links, and back-button
  // re-entry all resolve to the same live invoice data.
  const {
    data: invoice,
    isLoading: invoiceLoading,
    isError: invoiceError,
  } = useUserInvoiceDetail(invoiceId);

  const { data: fetchedPlan } = usePlanDetail(invoice?.plan_id);
  const plan = invoice?.plan || fetchedPlan;
  const rawAddress = invoice?.crypto_address || '';
  const paymentUri = invoice?.payment_uri || '';
  const paymentMethod = invoice?.payment_method;
  const currencyCode = invoice?.currency;
  const requested = invoice?.amount_requested;

  const redirectTimeoutRef = useRef(null);

  usePageTitle(
    `Complete Your Payment | ${COMPANY_NAME}`,
    `Complete your ${paymentMethod || 'crypto'} checkout to activate your secure VPN subscription.`
  );

  // Shared copy-flag hook: owns the reset timer and its unmount cleanup.
  const { copied, markCopied } = useCopied();

  const expiresAtIso = invoice?.expires_at || null;
  const hasDeadline = Boolean(expiresAtIso) && !Number.isNaN(new Date(expiresAtIso).getTime());

  const { remainingMs, expired: timerExpired } = useCountdown(expiresAtIso);

  // Status polling lives in the feature hooks layer (useDashboard), like every
  // other server interaction on this page.
  const {
    data: statusData,
    isLoading: checking,
    isError: fetchError,
    refetch,
  } = useInvoiceStatus(invoiceId, { enabled: !timerExpired });

  const currentStatus = statusData?.status?.toLowerCase();
  const diff = (statusData?.amount_requested || 0) - (statusData?.amount_paid || 0);
  const shortfall = currentStatus === 'partially_paid' ? Math.max(0, diff) : 0;

  const isTerminated = TERMINAL_INVOICE_STATUSES.includes(currentStatus) || timerExpired;

  const status = useMemo(() => {
    if (fetchError) {
      return { msg: '⚠️ Error checking payment status.', variant: 'danger' };
    }
    if (timerExpired) {
      return invoiceStatusMessage('expired');
    }
    return invoiceStatusMessage(currentStatus, diff, currencyCode);
  }, [fetchError, currentStatus, diff, currencyCode, timerExpired]);

  const triggerRedirect = useCallback(() => {
    if (!redirectTimeoutRef.current) {
      // Payment settlement happens server-side (provider webhook -> backend),
      // so React Query never observed a mutation. Mark the whole dashboard
      // cache family stale (profile, subscriptions, invoices, incl. this
      // invoice's polled status) so the Dashboard refetches on mount instead
      // of serving the pre-payment snapshot for the next staleTime window.
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      redirectTimeoutRef.current = setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 3000);
    }
  }, [navigate, queryClient]);

  useEffect(() => {
    if (isTerminated) {
      triggerRedirect();
    }
  }, [isTerminated, triggerRedirect]);

  useEffect(
    () => () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    },
    []
  );

  if (invoiceLoading) {
    return (
      <DashboardContainer>
        <DashboardHeader
          title="Send Payment"
          subtitle="Complete the transaction below to activate your account."
          backTo=""
        />
        <PageLoader fullscreen={false} className="py-5" />
      </DashboardContainer>
    );
  }

  // Unknown id, someone else's invoice, or a fetch failure: render an explicit
  // dead end instead of silently bouncing to /dashboard.
  if (invoiceError || !invoice) {
    return (
      <DashboardContainer>
        <DashboardHeader
          title="Send Payment"
          subtitle="Complete the transaction below to activate your account."
          backTo=""
        />
        <Row className="justify-content-center">
          <Col xs={12} md={8} lg={6}>
            <Alert variant="danger" className="text-center shadow-sm">
              We could not load this invoice. It may no longer be pending or may belong to another
              account.
            </Alert>
            <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
              <Button as={Link} to="/invoices" variant="outline-primary" className="fw-bold px-3">
                My Invoices
              </Button>
              <Button
                as={Link}
                to="/dashboard"
                variant="outline-secondary"
                className="fw-bold px-3"
              >
                Back to Dashboard
              </Button>
            </div>
          </Col>
        </Row>
      </DashboardContainer>
    );
  }

  const handleCopy = async () => {
    const textToCopy = rawAddress || paymentUri;
    if (!textToCopy) return;
    const didCopy = await copyToClipboard(textToCopy, { success: null, error: null });
    if (didCopy) markCopied();
  };

  const displayValue = rawAddress || paymentUri;
  const displayLabel = rawAddress ? `${paymentMethod} Address` : 'Payment URI';

  return (
    <DashboardContainer>
      <DashboardHeader
        title="Send Payment"
        subtitle="Complete the transaction below to activate your account."
        backTo=""
      />

      <Row className="justify-content-center">
        <Col xs={12} md={8} lg={6}>
          <Card className="border shadow-sm rounded-3">
            <Card.Body className="p-4">
              <div className="bg-body-tertiary rounded p-3 mb-4">
                <Row className="g-2 small align-items-center">
                  <Col xs={4} className="text-body-secondary">
                    Plan
                  </Col>
                  <Col xs={8} className="fw-bold text-end">
                    {plan?.name}
                  </Col>

                  {paymentMethod && (
                    <>
                      <Col xs={4} className="text-body-secondary">
                        Method
                      </Col>
                      <Col xs={8} className="fw-bold text-end text-uppercase">
                        {paymentMethod}
                      </Col>
                    </>
                  )}

                  <Col xs={4} className="text-body-secondary">
                    Total Due
                  </Col>
                  <Col xs={8} className="fw-bold text-end font-monospace fs-6 text-primary">
                    {formatCurrencyAmount(requested, currencyCode)}
                  </Col>
                </Row>
              </div>

              <div className="text-center my-4">
                <div className="bg-white rounded p-3 d-inline-block" style={{ maxWidth: 220 }}>
                  <QRCode
                    size={256}
                    style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                    value={paymentUri}
                    viewBox={`0 0 256 256`}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="text-body-secondary small fw-bold mb-1 d-block">
                  {displayLabel}
                </label>
                <div className="input-group">
                  <input
                    type="text"
                    readOnly
                    className="form-control font-monospace border-end-0 text-truncate"
                    value={displayValue}
                  />
                  <Button
                    variant={copied ? 'success' : 'outline-secondary'}
                    onClick={handleCopy}
                    disabled={checking}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>

              <Button
                variant="outline-primary"
                href={paymentUri}
                className="w-100 fw-medium mb-4 py-2"
              >
                Open in Native Wallet
              </Button>

              <Alert
                variant={status.variant}
                className="text-center py-2 mb-3 small d-flex align-items-center justify-content-center"
              >
                {status.msg}
                {checking && <Spinner size="sm" className="ms-2" animation="border" />}
              </Alert>

              {status.variant === 'warning' && shortfall > 0 && (
                <Button
                  variant="warning"
                  href={paymentUri}
                  className="w-100 mb-3 fw-bold py-2 shadow-sm"
                >
                  Pay Remaining Balance
                </Button>
              )}

              {!isTerminated && hasDeadline && (
                <div className="text-center mb-4">
                  <span className="text-body-secondary small">Time Remaining: </span>
                  <strong className="text-body-emphasis font-monospace fs-6">
                    {formatCountdown(remainingMs)}
                  </strong>
                </div>
              )}

              <Button
                variant="primary"
                className="w-100 fw-bold py-2"
                onClick={refetch}
                disabled={checking || isTerminated}
              >
                {checking ? 'Checking Status...' : 'Check Status'}
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </DashboardContainer>
  );
};

export default Payment;
