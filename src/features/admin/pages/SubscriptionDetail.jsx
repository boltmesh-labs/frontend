import { useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Button, Spinner, Row, Col } from 'react-bootstrap';
import { useConfirm } from '@/hooks/useConfirm';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  useSubscriptionDetail,
  useSubscriptionDevices,
  useSubscriptionInvoices,
  useCancelSubscription,
} from '@/features/admin/hooks/useSubscriptions';
import { useUserDetail } from '@/features/admin/hooks/useUsers';
import { DetailShell } from '@/components/DetailShell';
import { SectionCard } from '@/components/SectionCard';
import { DataTable } from '@/components/DataTable';
import { DetailHeader } from '../components/DetailHeader';
import { DetailSummary } from '../components/DetailSummary';
import { formatCurrencyAmount } from '@/utils/currencyFormatter';
import { getMethodDisplay } from '@/utils/methodDisplay';
import { formatDate } from '@/utils/dateFormatter';
import { SubscriptionStatusBadge } from '@/components/SubscriptionStatusBadge';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import { VpnDeviceStateBadge } from '@/components/VpnDeviceStateBadge';
import { AccountOwnerCard } from '../components/DetailAccount';
import { SUBSCRIPTION_INVOICE_COLUMNS, VPN_DEVICE_COLUMNS } from '@/constants/tableColumns';

import { SUBSCRIPTION_STATUSES } from '@/constants/statuses';

// Everything except `canceled` can still be cancelled by an admin (mirrors the
// backend's cancellation guard).
const CANCELLABLE_STATUSES = Object.values(SUBSCRIPTION_STATUSES).filter(
  (status) => status !== SUBSCRIPTION_STATUSES.canceled
);

const SubscriptionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm, confirmDialog } = useConfirm();

  const { data: subscription, isLoading, isError, error, refetch } = useSubscriptionDetail(id);

  const { data: devices = [], isLoading: isDevicesLoading } = useSubscriptionDevices(id);
  const { data: invoices = [], isLoading: isInvoicesLoading } = useSubscriptionInvoices(id);
  const { data: user } = useUserDetail(subscription?.user_id);

  const { mutate: cancelSubscription, isPending: isCancelling } = useCancelSubscription();

  usePageTitle(`Subscription ${id}`);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleCancelSubscription = async () => {
    const isConfirmed = await confirm({
      title: 'Cancel Subscription',
      message: 'Are you sure you want to cancel this subscription immediately?',
      confirmText: 'Cancel',
      confirmVariant: 'danger',
    });

    if (!isConfirmed) return;

    try {
      await cancelSubscription(id);
    } catch {
      // Feedback is owned by useCancelSubscription (toasts); the rejection is
      // contained here so the page does not double-toast.
    }
  };

  const summaryItems = useMemo(() => {
    if (!subscription) return [];

    return [
      {
        label: 'Plan',
        value: (
          <div className="d-inline-flex align-items-center gap-2">
            <span>{subscription.plan?.name || 'Unnamed Plan'}</span>
            {subscription.plan_id ? (
              <Link
                to={`/admin/plans/${subscription.plan_id}`}
                className="badge bg-primary-subtle text-primary text-decoration-none border border-primary-subtle px-2 py-1 rounded-2"
                title={`View plan #${subscription.plan_id}`}
              >
                #{subscription.plan_id}
              </Link>
            ) : (
              <span className="badge bg-secondary-subtle text-muted fw-normal">N/A</span>
            )}
          </div>
        ),
      },
      {
        label: 'Start Date',
        value: formatDate(subscription.started_at),
        className: 'small font-monospace',
      },
      {
        label: 'Expiration Date',
        value: formatDate(subscription.expires_at),
        className: 'small font-monospace fw-bold',
      },
      ...(subscription.canceled_at
        ? [
            {
              label: 'Canceled On',
              value: formatDate(subscription.canceled_at),
              className: 'small font-monospace fw-bold text-danger',
            },
          ]
        : []),
      {
        label: 'Created',
        value: formatDate(subscription.created_at),
        className: 'small font-monospace text-muted',
      },
      {
        label: 'Last Updated',
        value: formatDate(subscription.updated_at || subscription.created_at),
        className: 'small font-monospace text-muted',
      },
    ];
  }, [subscription]);

  const renderVpnDeviceRow = useCallback(
    (device) => (
      <tr key={device.id}>
        <td className="fw-bold font-monospace small text-break">
          <Link
            to={`/admin/vpn-devices/${device.id}`}
            className="text-decoration-none text-primary"
            title={`View device ${device.id}`}
          >
            {device.id}
          </Link>
        </td>
        <td>{device.name}</td>
        <td>{device.platform}</td>
        <td>
          <VpnDeviceStateBadge isActive={device.is_active} />
        </td>
        <td className="small font-monospace">{formatDate(device.created_at)}</td>
      </tr>
    ),
    []
  );

  const renderInvoiceRow = useCallback(
    (inv) => (
      <tr key={inv.id}>
        <td className="fw-bold font-monospace small text-break">
          <Link
            to={`/admin/invoices/${inv.id}`}
            className="text-decoration-none text-primary"
            title={`View invoice ${inv.id}`}
          >
            {inv.id}
          </Link>
        </td>
        <td className="text-uppercase small text-muted text-nowrap">
          {getMethodDisplay(inv.payment_method)}
        </td>
        <td>{formatCurrencyAmount(inv.amount_paid ?? 0, inv.currency || 'USD')}</td>
        <td>
          <InvoiceStatusBadge status={inv.status} />
        </td>
        <td className="small font-monospace">{formatDate(inv.created_at)}</td>
      </tr>
    ),
    []
  );

  const isCancellable = CANCELLABLE_STATUSES.includes(subscription?.status?.toLowerCase() || '');

  const userContext = user || {
    username: `User ${subscription?.user_id || 'N/A'}`,
    email: 'N/A',
    role: 'user',
  };

  const headerActions = isCancellable ? (
    <Button
      variant="outline-danger"
      className="shadow-sm"
      disabled={isCancelling || isLoading}
      onClick={handleCancelSubscription}
      aria-label="Cancel subscription immediately"
    >
      {isCancelling ? (
        <>
          <Spinner size="sm" animation="border" className="me-2" /> Cancelling...
        </>
      ) : (
        'Cancel Subscription'
      )}
    </Button>
  ) : null;

  return (
    <DetailShell
      loading={isLoading}
      error={isError ? error : null}
      data={subscription}
      refetch={refetch}
      notFoundMessage="Subscription record not found."
      onBack={handleBack}
      backLabel="↩ Back to List"
    >
      <Container className="py-4 position-relative min-vh-50">
        {confirmDialog}

        <DetailHeader title="Subscription" id={subscription?.id} actions={headerActions} />

        <Row className="g-4 mb-4">
          <Col lg={8}>
            <DetailSummary
              statusLabel="Subscription Status"
              badge={<SubscriptionStatusBadge status={subscription?.status} />}
              items={summaryItems}
            />
          </Col>

          <Col lg={4}>
            <AccountOwnerCard user={userContext} />
          </Col>
        </Row>

        <SectionCard title="VPN Devices">
          <DataTable
            columns={VPN_DEVICE_COLUMNS}
            data={devices}
            loading={isDevicesLoading}
            emptyMessage="No VPN client devices have been provisioned under this subscription yet."
            renderRow={renderVpnDeviceRow}
          />
        </SectionCard>

        <div className="mt-4">
          <SectionCard title="Invoices & Billing History">
            <DataTable
              columns={SUBSCRIPTION_INVOICE_COLUMNS}
              data={invoices}
              loading={isInvoicesLoading}
              emptyMessage="No transactional invoice history available for this subscription."
              renderRow={renderInvoiceRow}
            />
          </SectionCard>
        </div>
      </Container>
    </DetailShell>
  );
};

export default SubscriptionDetail;
