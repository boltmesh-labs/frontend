import { useCallback, useMemo } from 'react';
import { Button, Container, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useConfirm } from '@/hooks/useConfirm';
import {
  useUserDetail,
  useToggleUserStatus,
  useUserDevices,
  useUserSubscriptions,
  useUserInvoices,
} from '@/features/admin/hooks/useUsers';
import { formatCurrencyAmount } from '@/utils/currencyFormatter';
import { getMethodDisplay } from '@/utils/methodDisplay';
import { formatDate } from '@/utils/dateFormatter';
import { DetailShell } from '@/components/DetailShell';
import { SectionCard } from '@/components/SectionCard';
import { DataTable } from '@/components/DataTable';
import { UserRoleBadge, UserStateBadge, UserVerifiedBadge } from '@/components/UserBadges';
import { SubscriptionStatusBadge } from '@/components/SubscriptionStatusBadge';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import { VpnDeviceStateBadge } from '@/components/VpnDeviceStateBadge';
import { DetailHeader } from '../components/DetailHeader';
import { DetailSummary } from '../components/DetailSummary';
import {
  USER_INVOICE_COLUMNS,
  USER_SUBSCRIPTION_COLUMNS,
  VPN_DEVICE_COLUMNS,
} from '@/constants/tableColumns';

const UserDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm, confirmDialog } = useConfirm();

  usePageTitle(`User Profile ${id || ''}`);

  const { data: profile, isLoading, isError, error, refetch } = useUserDetail(id);

  const { mutate: toggleUserStatus, isPending: isToggling } = useToggleUserStatus();

  const { data: devices = [], isLoading: isLoadingDevices } = useUserDevices(id);
  const { data: subscriptions = [], isLoading: isLoadingSubscriptions } = useUserSubscriptions(id);
  const { data: invoices = [], isLoading: isLoadingInvoices } = useUserInvoices(id);

  const handleToggleStatus = useCallback(
    async (id, isActive) => {
      const actionLabel = isActive ? 'deactivate' : 'activate';
      const capitalized = actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1);

      const isConfirmed = await confirm({
        title: `${capitalized} Account`,
        message: `Are you sure you want to ${actionLabel} this user account?`,
        confirmText: capitalized,
        confirmVariant: isActive ? 'danger' : 'primary',
      });

      if (!isConfirmed) return;

      toggleUserStatus({ id, isActive });
    },
    [confirm, toggleUserStatus]
  );

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const summaryItems = useMemo(() => {
    if (!profile) return [];

    return [
      {
        label: 'Username',
        value: profile.username || 'N/A',
        className: 'text-break',
      },
      {
        label: 'Email',
        value: profile.email || 'N/A',
        className: 'text-break',
      },
      {
        label: 'Role',
        value: <UserRoleBadge role={profile.role} />,
      },
      {
        label: 'Email Status',
        value: <UserVerifiedBadge isVerified={profile.is_verified} />,
      },
      {
        label: 'Created',
        value: formatDate(profile.created_at),
        className: 'small font-monospace text-muted',
      },
      {
        label: 'Last Updated',
        value: formatDate(profile.updated_at || profile.created_at),
        className: 'small font-monospace text-muted',
      },
    ];
  }, [profile]);

  const renderVpnDeviceRow = useCallback(
    (device) => (
      <tr key={device.id}>
        <td className="fw-bold font-monospace small text-break">
          <Link
            to={`/admin/vpn-devices/${device.id}`}
            className="fw-bold text-decoration-none text-primary"
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

  const renderSubscriptionRow = useCallback(
    (sub) => (
      <tr key={sub.id}>
        <td className="fw-bold font-monospace small text-break">
          <Link
            to={`/admin/subscriptions/${sub.id}`}
            className="text-primary text-decoration-none"
            title={`View subscription ${sub.id}`}
          >
            {sub.id}
          </Link>
        </td>
        <td className="fw-bold text-body">{sub.plan?.name || 'N/A'}</td>
        <td>
          <SubscriptionStatusBadge status={sub.status} />
        </td>
        <td className="small font-monospace text-muted">{formatDate(sub.expires_at)}</td>
      </tr>
    ),
    []
  );

  const renderInvoiceRow = useCallback(
    (inv) => (
      <tr key={inv.id}>
        <td className="font-monospace fw-bold small text-break">
          <Link
            to={`/admin/invoices/${inv.id}`}
            className="text-primary text-decoration-none"
            title={`View invoice ${inv.id}`}
          >
            {inv.id}
          </Link>
        </td>
        <td className="fw-bold text-body">{inv.plan?.name || 'N/A'}</td>
        <td className="text-uppercase small text-muted text-nowrap">
          {getMethodDisplay(inv.payment_method)}
        </td>
        <td className="font-monospace fw-bold text-body">
          {formatCurrencyAmount(inv.amount_paid ?? 0, inv.currency || 'USD')}
        </td>
        <td>
          <InvoiceStatusBadge status={inv.status} />
        </td>
      </tr>
    ),
    []
  );

  const headerActions = profile ? (
    <Button
      variant={profile.is_active ? 'outline-warning' : 'outline-success'}
      className="shadow-sm"
      disabled={isToggling || isLoading}
      onClick={() => handleToggleStatus(profile.id, profile.is_active)}
      aria-label={`${profile.is_active ? 'Deactivate' : 'Activate'} account`}
    >
      {isToggling ? (
        <>
          <Spinner size="sm" animation="border" className="me-2" /> Updating...
        </>
      ) : profile.is_active ? (
        '⏸ Deactivate'
      ) : (
        '▶ Activate'
      )}
    </Button>
  ) : null;

  return (
    <DetailShell
      loading={isLoading}
      error={isError ? error : null}
      data={profile}
      refetch={refetch}
      notFoundMessage="Could not load user profile data."
      onBack={handleBack}
      backLabel="↩ Back to List"
    >
      <Container className="py-4 position-relative min-vh-50">
        {confirmDialog}

        <DetailHeader title="User Profile" id={profile?.id} actions={headerActions} />

        {/* TOP SECTION: User Details */}
        <DetailSummary
          statusLabel="Account Status"
          badge={<UserStateBadge isActive={profile?.is_active} />}
          items={summaryItems}
        />

        {/* VPN DEVICES TABLE */}
        <div className="mt-4">
          <SectionCard title="VPN Devices">
            <DataTable
              columns={VPN_DEVICE_COLUMNS}
              data={devices}
              loading={isLoadingDevices}
              emptyMessage="No configured VPN devices found for this user."
              renderRow={renderVpnDeviceRow}
            />
          </SectionCard>
        </div>

        {/* SUBSCRIPTIONS TABLE */}
        <div className="mt-4">
          <SectionCard title="Subscriptions">
            <DataTable
              columns={USER_SUBSCRIPTION_COLUMNS}
              data={subscriptions}
              loading={isLoadingSubscriptions}
              emptyMessage="No network subscriptions found for this user."
              renderRow={renderSubscriptionRow}
            />
          </SectionCard>
        </div>

        {/* INVOICES & BILLING HISTORY TABLE */}
        <div className="mt-4">
          <SectionCard title="Invoices & Billing History">
            <DataTable
              columns={USER_INVOICE_COLUMNS}
              data={invoices}
              loading={isLoadingInvoices}
              emptyMessage="No transactional invoice history available for this user."
              renderRow={renderInvoiceRow}
            />
          </SectionCard>
        </div>
      </Container>
    </DetailShell>
  );
};

export default UserDetail;
