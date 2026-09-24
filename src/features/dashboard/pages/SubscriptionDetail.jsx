import { useCallback } from 'react';
import { Badge, Button, Card, Table } from 'react-bootstrap';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { AsyncButton } from '@/components/AsyncButton';
import { useConfirm } from '@/hooks/useConfirm';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  useUserSubscriptionDetail,
  useCancelUserSubscription,
  useUserInvoicesBySubscription,
  useUserDevicesBySubscription,
} from '@/features/dashboard/hooks/useDashboard';
import { DetailShell } from '@/components/DetailShell';
import { SectionCard } from '@/components/SectionCard';
import { DataTable } from '@/components/DataTable';
import { MobileRecordCard } from '@/components/MobileRecordCard';
import { DashboardContainer } from '@/features/dashboard/components/DashboardContainer';
import { DashboardHeader } from '../components/DashboardHeader';
import { formatCurrencyAmount } from '@/utils/currencyFormatter';
import { formatDate } from '@/utils/dateFormatter';
import { copyToClipboard } from '@/utils/clipboard';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import { SubscriptionStatusBadge } from '@/components/SubscriptionStatusBadge';
import { getPlatformLabel } from '@/utils/devicePlatformDisplay';
import { COMPANY_NAME } from '@/utils/config';
import { INVOICE_COLUMNS } from '@/constants/tableColumns';
import { RENEWABLE_SUBSCRIPTION_STATUSES, SUBSCRIPTION_STATUSES } from '@/constants/statuses';

const DEVICE_COLUMNS = [{ header: 'Device' }, { header: 'Platform' }, { header: 'Created' }];

const SubscriptionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm, confirmDialog } = useConfirm();

  usePageTitle(
    `Subscription ${id || ''} | ${COMPANY_NAME}`,
    'View and manage your active subscription details, billing cycle, and renewal settings.'
  );

  const { data: subscription, isLoading, isError, error, refetch } = useUserSubscriptionDetail(id);

  const { data: invoices = [], isLoading: isInvoicesLoading } = useUserInvoicesBySubscription(id);
  const { data: devices = [], isLoading: isDevicesLoading } = useUserDevicesBySubscription(id);

  const { mutate: cancelSubscription, isPending: isCancelling } = useCancelUserSubscription();

  // The mutation owns success/error toasts and cache invalidation, so the page
  // only gates the action behind the confirm dialog — no parallel pending flag
  // or duplicated feedback here. (mutate() never throws; its errors surface
  // through the hook's onError.)
  const handleCancelSubscription = async () => {
    const isConfirmed = await confirm({
      title: 'Cancel Subscription',
      message:
        'Are you sure you want to cancel this subscription? You will retain access until the end of your current billing period.',
      confirmText: 'Confirm Cancellation',
      confirmVariant: 'danger',
    });

    if (!isConfirmed) return;

    cancelSubscription(id);
  };

  const handleRenewClick = () => {
    const planId = subscription?.plan?.id;
    if (!planId) return;
    navigate(`/checkout/${planId}`);
  };

  const renderInvoiceRow = useCallback(
    (invoice) => (
      <tr key={invoice.id}>
        <td className="font-monospace">
          <div className="d-flex align-items-center gap-2">
            <Link to={`/invoices/${invoice.id}`} className="text-primary text-decoration-none">
              {invoice.id}
            </Link>
            <Button
              variant="link"
              className="p-0 text-decoration-none text-muted lh-1"
              style={{ fontSize: '0.85rem' }}
              title="Copy Invoice ID"
              onClick={() => copyToClipboard(invoice.id, { success: 'Invoice ID copied!' })}
            >
              📋
            </Button>
          </div>
        </td>
        <td className="font-monospace fw-bold">
          {formatCurrencyAmount(invoice.amount_requested, invoice.currency)}
        </td>
        <td>
          <InvoiceStatusBadge status={invoice.status} />
        </td>
        <td className="text-muted">{formatDate(invoice.created_at)}</td>
      </tr>
    ),
    []
  );

  const renderDeviceRow = useCallback(
    (device) => (
      <tr key={device.id}>
        <td className="fw-semibold text-body">
          <div className="d-flex flex-column">
            <span>{device.name}</span>
          </div>
        </td>
        <td className="text-capitalize text-muted">{getPlatformLabel(device.platform)}</td>
        <td className="text-muted">{formatDate(device.created_at)}</td>
      </tr>
    ),
    []
  );

  const renderMobileInvoice = useCallback(
    (invoice) => (
      <MobileRecordCard
        title={invoice.id}
        titleHref={`/invoices/${invoice.id}`}
        items={[
          {
            label: 'Amount',
            value: formatCurrencyAmount(invoice.amount_requested, invoice.currency),
          },
          { label: 'Status', value: <InvoiceStatusBadge status={invoice.status} /> },
          { label: 'Date', value: formatDate(invoice.created_at) },
        ]}
      />
    ),
    []
  );

  const renderMobileDevice = useCallback(
    (device) => (
      <MobileRecordCard
        title={device.name}
        items={[
          { label: 'Platform', value: getPlatformLabel(device.platform) },
          { label: 'Created', value: formatDate(device.created_at) },
        ]}
      />
    ),
    []
  );

  const normalizedStatus = subscription?.status?.toLowerCase() || '';

  const canRenew =
    normalizedStatus !== '' &&
    [
      SUBSCRIPTION_STATUSES.active,
      SUBSCRIPTION_STATUSES.grace_period,
      SUBSCRIPTION_STATUSES.trialing,
      SUBSCRIPTION_STATUSES.expired,
      SUBSCRIPTION_STATUSES.past_due,
      SUBSCRIPTION_STATUSES.canceled,
    ].includes(normalizedStatus);
  const renewLabel = RENEWABLE_SUBSCRIPTION_STATUSES.includes(normalizedStatus)
    ? 'Extend Plan'
    : 'Renew Plan';

  const canBeCanceled =
    normalizedStatus !== '' && normalizedStatus !== SUBSCRIPTION_STATUSES.canceled;

  return (
    <DetailShell
      loading={isLoading}
      error={isError ? error : null}
      data={subscription}
      refetch={refetch}
      notFoundMessage="Subscription not found."
      backTo="/subscriptions"
      backLabel="← Back to Subscriptions"
      backVariant="outline-primary"
    >
      <DashboardContainer>
        {confirmDialog}
        <DashboardHeader
          title="Subscription Details"
          subtitle="Manage plan options, billing terms, and renewal configurations."
          backTo="/subscriptions"
          rightAction={
            <div className="d-flex flex-wrap gap-2">
              {canRenew && (
                <Button
                  variant="outline-primary"
                  className="fw-bold px-3 py-2 text-nowrap"
                  size="sm"
                  onClick={handleRenewClick}
                >
                  {renewLabel}
                </Button>
              )}
              {canBeCanceled && (
                <AsyncButton
                  variant="outline-danger"
                  className="fw-bold px-3 py-2 text-nowrap"
                  size="sm"
                  loading={isCancelling}
                  loadingLabel="Cancelling..."
                  onClick={handleCancelSubscription}
                >
                  Cancel Subscription
                </AsyncButton>
              )}
            </div>
          }
        />

        <Card className="border-0 shadow-sm p-4 rounded-3 mb-4">
          <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-4">
            <div>
              <h4 className="fw-bold text-body mb-1">
                {subscription?.plan?.name || `Plan #${subscription?.plan_id || '—'}`}
              </h4>
              <span className="text-muted small font-monospace">UUID: {subscription?.id}</span>
            </div>
            <div className="text-end">
              <SubscriptionStatusBadge status={subscription?.status} />
            </div>
          </div>

          <Table responsive borderless className="align-middle m-0 small detail-table">
            <tbody>
              <tr>
                <td className="text-secondary py-2">Plan Price</td>
                <td className="font-monospace fw-bold text-body text-end fs-6">
                  {formatCurrencyAmount(subscription?.plan?.price_usd, 'USD')}{' '}
                  <span className="text-muted fs-7">
                    / {subscription?.plan?.billing_cycle || 'period'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="text-secondary py-2">Duration</td>
                <td className="text-body text-end">
                  {subscription?.plan?.duration_in_days || '—'} days
                </td>
              </tr>
              {subscription?.plan?.description && (
                <tr>
                  <td className="text-secondary py-2">Description</td>
                  <td className="text-body text-end">{subscription.plan.description}</td>
                </tr>
              )}
              {subscription?.plan?.features?.length > 0 && (
                <tr>
                  <td className="text-secondary py-2 align-top">Features</td>
                  <td className="text-body text-end">
                    <ul className="list-unstyled m-0">
                      {subscription.plan.features.map((feature, i) => (
                        <li key={i} className="mb-1">
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              )}
              <tr>
                <td className="text-secondary py-2">Auto Renewal</td>
                <td className="text-end">
                  <Badge bg="secondary">Coming Soon</Badge>
                  <div className="text-muted small">Available with fiat payments</div>
                </td>
              </tr>
              <tr>
                <td className="text-secondary py-2">Start Date</td>
                <td className="text-body text-end font-monospace">
                  {formatDate(subscription?.started_at)}
                </td>
              </tr>
              <tr>
                <td className="text-secondary py-2">Expires On</td>
                <td className="fw-bold text-body text-end font-monospace">
                  {formatDate(subscription?.expires_at)}
                </td>
              </tr>
              {subscription?.canceled_at && (
                <tr>
                  <td className="text-secondary py-2">Canceled On</td>
                  <td className="text-danger fw-bold text-end font-monospace">
                    {formatDate(subscription?.canceled_at)}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>

        <SectionCard
          title="Associated Invoices"
          subtitle="Billing history and invoice transactions for this subscription."
        >
          <DataTable
            columns={INVOICE_COLUMNS}
            data={invoices}
            loading={isInvoicesLoading}
            renderRow={renderInvoiceRow}
            renderMobileItem={renderMobileInvoice}
            emptyMessage="No associated invoices found for this subscription."
          />
        </SectionCard>

        <div className="mt-4">
          <SectionCard
            title="Associated Devices"
            subtitle="Active sessions and registered hardware assigned to this subscription slot."
            actions={
              subscription?.plan?.max_devices && (
                <Badge bg="light" text="dark" className="border px-3 py-2 font-monospace">
                  Slots: {devices.length} / {subscription?.plan?.max_devices}
                </Badge>
              )
            }
          >
            <DataTable
              columns={DEVICE_COLUMNS}
              data={devices}
              loading={isDevicesLoading}
              renderRow={renderDeviceRow}
              renderMobileItem={renderMobileDevice}
              emptyMessage="No active devices connected to this subscription."
            />
          </SectionCard>
        </div>
      </DashboardContainer>
    </DetailShell>
  );
};

export default SubscriptionDetail;
