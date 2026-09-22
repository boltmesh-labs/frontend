import { useCallback, useState } from 'react';
import { Alert, Button, Card, Table } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { AsyncButton } from '@/components/AsyncButton';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { useCountdown } from '@/hooks/useCountdown';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  useCancelInvoice,
  usePlanDetail,
  useUserInvoiceDetail,
} from '@/features/dashboard/hooks/useDashboard';
import { copyToClipboard } from '@/utils/clipboard';
import { formatCurrencyAmount } from '@/utils/currencyFormatter';
import { formatDate } from '@/utils/dateFormatter';
import { getMethodDisplay } from '@/utils/methodDisplay';
import { PAYMENT_TABLE_COLUMNS } from '@/constants/tableColumns';
import { ACTIONABLE_INVOICE_STATUSES, INVOICE_STATUSES } from '@/constants/statuses';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import { PaymentStatusBadge } from '@/components/PaymentStatusBadge';
import { DetailShell } from '@/components/DetailShell';
import { SectionCard } from '@/components/SectionCard';
import { DataTable } from '@/components/DataTable';
import { DashboardContainer } from '@/features/dashboard/components/DashboardContainer';
import { DashboardHeader } from '../components/DashboardHeader';
import { COMPANY_NAME } from '@/utils/config';

const formatRemainingText = (diff) => {
  if (diff <= 0) return null;

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m ${seconds}s remaining`;
};

const InvoiceTimer = ({ expiresAt, isAlreadyExpired, onExpire }) => {
  // useCountdown owns the interval and fires onExpire exactly once per expiry
  // transition, so no stray tick can re-trigger the callback before the
  // parent tears the timer down via prop changes.
  const { remainingMs, expired } = useCountdown(expiresAt, { onExpire });

  if (isAlreadyExpired || expired || remainingMs <= 0) return null;

  return (
    <span className="d-block text-warning fw-bold small mt-1 font-monospace">
      ⏳ {formatRemainingText(remainingMs)}
    </span>
  );
};

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { runConfirmed, busy, confirmDialog } = useConfirmAction();

  usePageTitle(
    `Invoice ${id || ''} | ${COMPANY_NAME}`,
    'Review detailed invoice metadata and transaction history.'
  );

  const [isTimerExpired, setIsTimerExpired] = useState(false);

  const cancelMutation = useCancelInvoice();

  const { data: invoice, isLoading, isError, error, refetch } = useUserInvoiceDetail(id);

  const { data: plan } = usePlanDetail(invoice?.plan_id);

  const handleTimerExpire = useCallback(() => {
    setIsTimerExpired(true);
  }, []);

  const payments = invoice?.payments || [];

  // Payment fetches the invoice by route param; the shared invoiceDetail
  // React Query cache makes this navigation render instantly.
  const handlePayClick = useCallback(
    (inv) => {
      if (!inv?.id) return;
      navigate(`/payment/${inv.id}`);
    },
    [navigate]
  );

  // useConfirmAction owns the confirm dialog, busy flag, and success/error
  // feedback; the mutation itself only invalidates the invoice caches, which
  // refetches this page — no manual refetch() needed.
  const handleCancelInvoice = () =>
    runConfirmed('cancel-invoice', {
      title: 'Cancel Invoice',
      message: 'Are you sure you want to cancel this invoice?',
      confirmText: 'Cancel',
      confirmVariant: 'danger',
      run: () => cancelMutation.mutateAsync(id),
      successMessage: 'Invoice has been canceled.',
    });

  const currency = invoice?.currency || 'USD';

  const renderPaymentRow = useCallback(
    (payment) => (
      <tr key={payment.id}>
        <td className="font-monospace" style={{ maxWidth: '220px' }}>
          <div className="d-flex align-items-center gap-2">
            <span
              className="text-truncate d-inline-block"
              style={{ maxWidth: '160px' }}
              title={payment.external_tx_id || '—'}
            >
              {payment.external_tx_id || '—'}
            </span>
            {payment.external_tx_id && (
              <Button
                variant="link"
                className="p-0 text-decoration-none text-muted lh-1"
                style={{ fontSize: '0.85rem' }}
                title="Copy Transaction ID"
                onClick={() =>
                  copyToClipboard(payment.external_tx_id, { success: 'Transaction ID copied!' })
                }
              >
                📋
              </Button>
            )}
          </div>
        </td>
        <td className="font-monospace fw-bold">{formatCurrencyAmount(payment.amount, currency)}</td>
        <td>
          <div className="d-flex flex-column gap-1 align-items-start">
            <PaymentStatusBadge status={payment.status} />

            {typeof payment.confirmations === 'number' && (
              <span className="text-muted font-monospace" style={{ fontSize: '0.75rem' }}>
                {payment.confirmations} confirmations
              </span>
            )}

            {payment.fee > 0 && (
              <span className="text-muted font-monospace" style={{ fontSize: '0.75rem' }}>
                Fee: {formatCurrencyAmount(payment.fee, currency)}
              </span>
            )}
          </div>
        </td>
        <td className="text-muted">{formatDate(payment.created_at)}</td>
      </tr>
    ),
    [currency]
  );

  const normalizedStatus = invoice?.status?.toLowerCase() || '';
  const isPending = normalizedStatus === INVOICE_STATUSES.pending;
  const isPaid = normalizedStatus === INVOICE_STATUSES.paid;

  const canBeExpired = ACTIONABLE_INVOICE_STATUSES.includes(normalizedStatus);

  const isExpired =
    normalizedStatus === INVOICE_STATUSES.expired ||
    normalizedStatus === INVOICE_STATUSES.expired_partially_paid ||
    (canBeExpired && isTimerExpired);

  const isCancellable = isPending && !isExpired;
  const canPay = (isPending || normalizedStatus === INVOICE_STATUSES.partially_paid) && !isExpired;
  const showPaymentDetails = isPending && !isExpired;

  const displayAddress = invoice?.crypto_address || '';
  const paymentUri = invoice?.payment_uri || '';

  return (
    <DetailShell
      loading={isLoading}
      error={isError ? error : null}
      data={invoice}
      refetch={refetch}
      notFoundMessage="Invoice not found."
      backTo="/invoices"
      backLabel="← Back to Invoices"
      backVariant="outline-primary"
    >
      <DashboardContainer>
        {confirmDialog}
        <DashboardHeader
          title="Invoice Details"
          subtitle="Detailed invoice metadata and associated transaction history."
          backTo="/invoices"
          rightAction={
            (canPay || isCancellable) && (
              <div className="d-flex gap-2">
                {canPay && (
                  <Button
                    variant="primary"
                    className="fw-bold px-3 py-2"
                    size="sm"
                    onClick={() => handlePayClick(invoice)}
                  >
                    Pay
                  </Button>
                )}
                {isCancellable && (
                  <AsyncButton
                    variant="danger"
                    className="fw-bold px-3 py-2"
                    size="sm"
                    loading={busy !== null}
                    loadingLabel="Cancelling..."
                    onClick={handleCancelInvoice}
                  >
                    Cancel
                  </AsyncButton>
                )}
              </div>
            )
          }
        />

        <Card className="border-0 shadow-sm p-4 h-100 rounded-3 mb-4">
          <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-4">
            <div>
              <span className="text-muted small font-monospace d-inline-block mt-1">
                UUID: {invoice?.id}
              </span>
            </div>
            <div className="text-end">
              <InvoiceStatusBadge status={invoice?.status} />

              {canBeExpired && (
                <InvoiceTimer
                  expiresAt={invoice?.expires_at}
                  isAlreadyExpired={isExpired}
                  onExpire={handleTimerExpire}
                />
              )}
            </div>
          </div>

          <Table responsive borderless className="align-middle m-0 small">
            <tbody>
              <tr>
                <td className="text-secondary py-2">Plan</td>
                <td className="fw-bold text-body text-end">
                  {plan?.name || `Plan #${invoice?.plan_id || '—'}`}
                </td>
              </tr>
              <tr>
                <td className="text-secondary py-2">Payment Method</td>
                <td className="fw-bold text-body text-end">
                  {getMethodDisplay(invoice?.payment_method)}
                </td>
              </tr>
              <tr>
                <td className="text-secondary py-2">Currency</td>
                <td className="fw-bold text-body text-end">{invoice?.currency || '—'}</td>
              </tr>
              <tr>
                <td className="text-secondary py-2">Amount Due</td>
                <td className="font-monospace fw-bold text-body text-end fs-6">
                  {formatCurrencyAmount(invoice?.amount_requested, invoice?.currency)}
                </td>
              </tr>
              <tr className={isPaid ? 'border-bottom' : ''}>
                <td className="text-secondary py-2">Amount Paid</td>
                <td className="font-monospace fw-bold text-success text-end fs-6">
                  {isPaid && <span className="me-1">✓</span>}
                  {formatCurrencyAmount(invoice?.amount_paid || 0, invoice?.currency)}
                </td>
              </tr>
              <tr>
                <td className="text-secondary py-2">Tracking ID</td>
                <td className="font-monospace fw-bold text-end text-body py-2">
                  <div className="d-flex align-items-center justify-content-end gap-2">
                    <span
                      className="text-truncate d-inline-block"
                      style={{ maxWidth: '200px' }}
                      title={invoice?.tracking_id || '—'}
                    >
                      {invoice?.tracking_id || '—'}
                    </span>
                    {invoice?.tracking_id && (
                      <Button
                        variant="link"
                        className="p-0 text-decoration-none text-muted lh-1 flex-shrink-0"
                        style={{ fontSize: '0.85rem' }}
                        title="Copy Tracking ID"
                        onClick={() =>
                          copyToClipboard(invoice?.tracking_id, {
                            success: 'Tracking ID copied!',
                          })
                        }
                      >
                        📋
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
              {(isPaid || invoice?.paid_at) && (
                <tr className="border-bottom">
                  <td className="text-secondary py-2 fw-semibold text-success">Paid On</td>
                  <td className="text-success fw-bold text-end font-monospace">
                    {formatDate(invoice?.paid_at)}
                  </td>
                </tr>
              )}

              {invoice?.canceled_at && (
                <tr className="border-bottom">
                  <td className="text-secondary py-2 fw-semibold text-danger">Canceled On</td>
                  <td className="text-danger fw-bold text-end font-monospace">
                    {formatDate(invoice?.canceled_at)}
                  </td>
                </tr>
              )}

              {invoice?.refunded_at && (
                <tr className="border-bottom">
                  <td className="text-secondary py-2 fw-semibold text-info">Refunded On</td>
                  <td className="text-info fw-bold text-end font-monospace">
                    {formatDate(invoice?.refunded_at)}
                  </td>
                </tr>
              )}

              {canBeExpired && invoice?.expires_at && (
                <tr>
                  <td className="text-secondary py-2">Expires On</td>
                  <td
                    className={`fw-bold text-end font-monospace ${
                      isExpired ? 'text-danger' : 'text-muted'
                    }`}
                  >
                    {formatDate(invoice?.expires_at)} {isExpired && '(Expired)'}
                  </td>
                </tr>
              )}

              <tr>
                <td className="text-secondary py-2">Created</td>
                <td className="text-muted text-end">{formatDate(invoice?.created_at)}</td>
              </tr>
              <tr>
                <td className="text-secondary py-2">Last Updated</td>
                <td className="text-muted text-end">
                  {formatDate(invoice?.updated_at || invoice?.created_at)}
                </td>
              </tr>
            </tbody>
          </Table>

          {isExpired && (
            <Alert variant="warning" className="mt-4 mb-0 border-0 shadow-sm text-center">
              ⚠️ This invoice expired on <strong>{formatDate(invoice?.expires_at)}</strong>. Please
              create a new invoice to proceed with payment.
            </Alert>
          )}

          {showPaymentDetails && (
            <div className="mt-4 p-3 rounded-3 border">
              {displayAddress && (
                <div className="mb-3">
                  <span className="text-muted small fw-bold d-block mb-1 text-uppercase font-monospace">
                    Crypto Deposit Address
                  </span>
                  <div className="d-flex align-items-center justify-content-between gap-2">
                    <span className="font-monospace text-body text-break small p-2 rounded border flex-grow-1 select-all">
                      {displayAddress}
                    </span>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="fw-bold flex-shrink-0 rounded-3"
                      onClick={() =>
                        copyToClipboard(displayAddress, { success: 'Address copied!' })
                      }
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}

              {paymentUri && (
                <div className="mb-3">
                  <span className="text-muted small fw-bold d-block mb-1 text-uppercase font-monospace">
                    Payment URI
                  </span>
                  <div className="d-flex align-items-center justify-content-between gap-2">
                    <span className="font-monospace text-body text-break small p-2 rounded border flex-grow-1 select-all text-truncate">
                      {paymentUri}
                    </span>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="fw-bold flex-shrink-0 rounded-3"
                      onClick={() =>
                        copyToClipboard(paymentUri, { success: 'Payment URI copied!' })
                      }
                    >
                      Copy Link
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        <SectionCard
          title="Payment History"
          subtitle="All transactions and payment attempts for this invoice."
        >
          <DataTable
            columns={PAYMENT_TABLE_COLUMNS}
            data={payments}
            renderRow={renderPaymentRow}
            emptyMessage="No payment attempts found for this invoice."
          />
        </SectionCard>
      </DashboardContainer>
    </DetailShell>
  );
};

export default InvoiceDetail;
