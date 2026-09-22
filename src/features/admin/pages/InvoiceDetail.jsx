import React, { useMemo } from 'react';
import { Button, Col, Container, Row } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { useConfirm } from '@/hooks/useConfirm';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useInvoiceDetail, useCancelInvoice } from '@/features/admin/hooks/useInvoices';
import { useUserDetail } from '@/features/admin/hooks/useUsers';
import { usePlanDetail } from '@/features/admin/hooks/usePlans';
import { DetailShell } from '@/components/DetailShell';
import { SectionCard } from '@/components/SectionCard';
import { formatCurrencyAmount } from '@/utils/currencyFormatter';
import { getMethodDisplay } from '@/utils/methodDisplay';
import { formatDate } from '@/utils/dateFormatter';

import { INVOICE_STATUSES } from '@/constants/statuses';

import { DataTable } from '@/components/DataTable';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import { PaymentStatusBadge } from '@/components/PaymentStatusBadge';
import { DetailHeader } from '../components/DetailHeader';
import { AccountOwnerCard } from '../components/DetailAccount';
import { LinkedCard } from '../components/DetailLinked';
import { DetailSummary } from '../components/DetailSummary';
import { CopyableField } from '@/components/CopyableField';
import { INVOICE_PAYMENTS_COLUMNS } from '@/constants/tableColumns';

const PaymentRow = React.memo(({ payment, invoiceCurrency }) => {
  const currency = invoiceCurrency;

  return (
    <tr>
      <td className="fw-bold font-monospace small text-break">
        <Link to={`/admin/payments/${payment.id}`} className="text-primary text-decoration-none">
          {payment.id}
        </Link>
      </td>
      <td className="font-monospace text-break user-select-all" style={{ maxWidth: '120px' }}>
        {payment.external_tx_id || '—'}
      </td>
      <td className="font-monospace fw-bold text-body">
        {formatCurrencyAmount(payment.amount, currency)}
      </td>
      <td>
        <div className="d-flex flex-column gap-1 align-items-start">
          <PaymentStatusBadge status={payment.status} />
          {typeof payment.confirmations === 'number' && (
            <span className="text-muted font-monospace" style={{ fontSize: '0.75rem' }}>
              {payment.confirmations}{' '}
              {payment.confirmations === 1 ? 'confirmation' : 'confirmations'}
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
  );
});
PaymentRow.displayName = 'PaymentRow';

const InvoiceDetail = () => {
  const { id } = useParams();
  const { confirm, confirmDialog } = useConfirm();

  const { data: invoice, isLoading, isError, error, refetch } = useInvoiceDetail(id);

  const { data: user } = useUserDetail(invoice?.user_id);
  const { data: plan } = usePlanDetail(invoice?.plan_id);

  const cancelMutation = useCancelInvoice();

  usePageTitle(`Invoice ${id || ''}`);

  const handleCancelInvoice = async () => {
    const isConfirmed = await confirm({
      title: 'Cancel Invoice',
      // Node message (not a string) so <strong> renders instead of showing as
      // literal markup — ConfirmModal only wraps plain strings in a <p>.
      message: (
        <>
          Are you sure you want to cancel invoice <strong>{invoice?.id}</strong>? This action cannot
          be undone.
        </>
      ),
      confirmText: 'Confirm Cancellation',
      confirmVariant: 'danger',
    });

    if (!isConfirmed) return;

    try {
      // Backend exposes POST /admin/invoices/{id}/cancel for cancellation.
      await cancelMutation.mutateAsync(id);
    } catch {
      // Feedback is owned by useCancelInvoice (toasts); the rejection is
      // contained here so the page does not double-toast.
    }
  };

  // Status literals come from constants/statuses.js so these predicates can
  // never drift from the backend enum (same source as the Payment page).
  const statusNormalized = invoice?.status?.toLowerCase();
  const isCancellable = statusNormalized === INVOICE_STATUSES.pending;
  const isPaid = statusNormalized === INVOICE_STATUSES.paid;
  const isExpired = statusNormalized === INVOICE_STATUSES.expired;

  const trackingId = invoice?.tracking_id || '';
  const displayAddress = invoice?.crypto_address || '';
  const displayUri = invoice?.payment_uri || '';

  const userContext = user || {
    username: invoice?.user_id ? `User #${invoice.user_id}` : 'System User',
    email: 'No email linked',
  };

  const subscriptionId = invoice?.subscription_id;
  const paymentList = Array.isArray(invoice?.payments) ? invoice.payments : [];

  const summaryItems = useMemo(() => {
    if (!invoice) return [];

    const items = [
      {
        label: 'Plan',
        value: (
          <div className="d-inline-flex align-items-center gap-2">
            <span>{plan?.name || 'Unnamed Plan'}</span>
            {invoice.plan_id ? (
              <Link
                to={`/admin/plans/${invoice.plan_id}`}
                className="badge bg-primary-subtle text-primary text-decoration-none border border-primary-subtle px-2 py-1 rounded-2"
                title={`View plan #${invoice.plan_id}`}
              >
                #{invoice.plan_id}
              </Link>
            ) : (
              <span className="badge bg-secondary-subtle text-muted fw-normal">N/A</span>
            )}
          </div>
        ),
      },
      {
        label: 'Payment Method',
        value: getMethodDisplay(invoice.payment_method),
      },
      {
        label: 'Currency',
        value: invoice.currency || 'USD',
        className: 'fw-bold text-body text-uppercase',
      },
      {
        label: 'Amount Due',
        value: formatCurrencyAmount(invoice.amount_requested, invoice.currency),
        className: 'font-monospace fw-bold text-body fs-6',
      },
      {
        label: 'Amount Paid',
        value: (
          <>
            {isPaid && <span className="me-1">✓</span>}
            {formatCurrencyAmount(invoice.amount_paid || 0, invoice.currency)}
          </>
        ),
        className: 'font-monospace fw-bold text-success fs-6',
      },
      {
        label: 'Fiat Currency',
        value: (invoice.fiat_currency || 'usd').toUpperCase(),
        className: 'fw-bold text-body text-uppercase',
      },
      {
        label: 'Fiat Amount',
        value: formatCurrencyAmount(invoice.fiat_amount || 0, invoice.fiat_currency || 'usd'),
        className: 'font-monospace fw-bold text-body',
      },
      {
        label: 'Exchange Rate',
        value:
          invoice.exchange_rate != null
            ? `1 ${invoice.currency} = ${Math.round(Number(invoice.exchange_rate))} ${invoice.fiat_currency.toUpperCase()}`
            : '—',
        className: 'font-monospace text-body',
      },
      {
        label: 'Base Amount (USD)',
        value: formatCurrencyAmount(invoice.base_amount_usd || 0, 'usd'),
        className: 'font-monospace text-body',
      },
      {
        label: 'FX Rate to USD',
        value: invoice.fx_rate_to_usd != null ? invoice.fx_rate_to_usd : '—',
        className: 'font-monospace text-body',
      },
    ];

    if (invoice.subaddress_index != null) {
      items.push({
        label: 'Subaddress Index',
        value: invoice.subaddress_index,
        className: 'font-monospace text-body',
      });
    }

    if (isPaid || invoice.paid_at) {
      items.push({
        label: 'Paid On',
        value: formatDate(invoice.paid_at),
        className: 'text-success fw-bold font-monospace',
      });
    }

    if (invoice.canceled_at) {
      items.push({
        label: 'Canceled On',
        value: formatDate(invoice.canceled_at),
        className: 'text-danger fw-bold font-monospace',
      });
    }

    if (invoice.refunded_at) {
      items.push({
        label: 'Refunded On',
        value: formatDate(invoice.refunded_at),
        className: 'text-info fw-bold font-monospace',
      });
    }

    items.push(
      {
        label: 'Created',
        value: formatDate(invoice.created_at),
        className: 'text-muted',
      },
      {
        label: 'Expires',
        value: formatDate(invoice.expires_at),
        className: isExpired ? 'text-danger fw-bold font-monospace' : 'text-muted font-monospace',
      },
      {
        label: 'Last Updated',
        value: formatDate(invoice.updated_at || invoice.created_at),
        className: 'text-muted',
      }
    );

    return items;
  }, [invoice, isPaid, isExpired, plan?.name]);

  return (
    <DetailShell
      loading={isLoading}
      error={isError ? error : null}
      data={invoice}
      refetch={refetch}
      notFoundMessage="Could not load invoice data."
      backTo="/admin/invoices"
      backLabel="← Return to Invoices"
      backVariant="outline-danger"
    >
      <Container className="py-4 position-relative min-vh-50">
        {confirmDialog}

        <DetailHeader
          title="Invoice"
          id={invoice?.id}
          actions={
            isCancellable && (
              <Button variant="outline-danger" className="shadow-sm" onClick={handleCancelInvoice}>
                Cancel Invoice
              </Button>
            )
          }
        />

        <Row className="g-4 mb-5">
          <Col lg={8}>
            <DetailSummary
              statusLabel="Invoice Status"
              badge={<InvoiceStatusBadge status={invoice?.status} />}
              items={summaryItems}
            >
              {(trackingId || displayAddress || displayUri) && (
                <div className="mt-4 p-3 rounded-3 border bg-body">
                  {trackingId && (
                    <CopyableField
                      label="Tracking ID"
                      value={trackingId}
                      toastLabel="Tracking ID"
                      className={displayAddress || displayUri ? 'mb-3' : ''}
                    />
                  )}
                  {displayAddress && (
                    <CopyableField
                      label="Crypto Deposit Address"
                      value={displayAddress}
                      toastLabel="Deposit Address"
                      className={displayUri ? 'mb-3' : ''}
                    />
                  )}
                  {displayUri && (
                    <CopyableField
                      label="Payment URI"
                      value={displayUri}
                      toastLabel="Payment URI"
                      truncate={true}
                    />
                  )}
                </div>
              )}
            </DetailSummary>
          </Col>

          <Col lg={4} className="d-flex flex-column gap-4">
            <AccountOwnerCard user={userContext} />
            {subscriptionId && (
              <LinkedCard
                uuid={subscriptionId}
                label="Linked Subscription 📅"
                targetUrl={`/admin/subscriptions/${subscriptionId}`}
              />
            )}
          </Col>
        </Row>

        <SectionCard
          title="Payment History"
          subtitle="All transactions and payment attempts for this invoice."
        >
          <DataTable
            columns={INVOICE_PAYMENTS_COLUMNS}
            data={paymentList}
            renderRow={(payment) => (
              <PaymentRow key={payment.id} payment={payment} invoiceCurrency={invoice?.currency} />
            )}
            emptyMessage="No payment attempts found for this invoice."
          />
        </SectionCard>
      </Container>
    </DetailShell>
  );
};

export default InvoiceDetail;
