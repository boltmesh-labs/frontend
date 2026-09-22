import React, { useCallback } from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { AsyncButton } from '@/components/AsyncButton';
import { useTableQuery } from '@/hooks/useTableQuery';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getPaginationTotals } from '@/utils/pagination';
import { useConfirm } from '@/hooks/useConfirm';
import { useVpnDevices, useToggleVpnDeviceStatus } from '@/features/admin/hooks/useVpnDevices';
import { DataTable } from '@/components/DataTable';
import { DefaultPagination } from '@/components/DefaultPagination';
import { StatusAlert } from '@/components/StatusAlert';
import { TableFiltersBar } from '@/components/TableFiltersBar';
import { VpnDeviceStateBadge } from '@/components/VpnDeviceStateBadge';
import { PageHeader } from '../components/ListHeader';
import { formatDate } from '@/utils/dateFormatter';
import { COMPANY_NAME } from '@/utils/config';
import { PLATFORM_OPTIONS } from '@/utils/devicePlatformDisplay';

const TABLE_COLUMNS = [
  { header: 'Device' },
  { header: 'Subscription' },
  { header: 'Platform' },
  { header: 'State' },
  { header: 'Created' },
  { header: 'Actions', className: 'text-center' },
];

// 'true'/'false' are raw select values; paramValue decodes them into real
// booleans for the is_active query param.
const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

// Canonical platform list lives in utils/devicePlatformDisplay (mirrors
// backend VpnDevicePlatformEnum); prepend the "all" sentinel for the filter.
const PLATFORM_FILTER_OPTIONS = [{ value: '', label: 'All Platforms' }, ...PLATFORM_OPTIONS];

const FILTERS = [
  {
    key: 'status',
    options: STATUS_OPTIONS,
    ariaLabel: 'Filter by active status',
    paramKey: 'is_active',
    paramValue: (v) => v === 'true',
  },
  {
    key: 'platform',
    options: PLATFORM_FILTER_OPTIONS,
    ariaLabel: 'Filter by platform',
  },
];

const VpnDeviceRow = React.memo(({ device, processingId, toggle }) => {
  const isProcessing = processingId === device.id;

  return (
    <tr>
      <td className="fw-bold font-monospace small text-break">
        <Link
          to={`/admin/vpn-devices/${device.id}`}
          className="text-decoration-none text-primary"
          title={`View details for ${device.name || `Device ${device.id}`}`}
        >
          {device.id}
        </Link>
      </td>
      <td className="fw-bold font-monospace small text-break">
        {device.subscription_id ? (
          <Link
            to={`/admin/subscriptions/${device.subscription_id}`}
            className="text-decoration-none text-primary"
            title={`View subscription ${device.subscription_id}`}
          >
            {device.subscription_id}
          </Link>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>

      <td className="font-monospace text-muted small">{device.platform || '—'}</td>
      <td>
        <VpnDeviceStateBadge isActive={device.is_active} />
      </td>
      <td className="small font-monospace text-muted">{formatDate(device.created_at)}</td>
      <td className="text-end">
        <AsyncButton
          variant={device.is_active ? 'outline-warning' : 'outline-success'}
          size="sm"
          className="px-3 fw-bold shadow-sm"
          loading={isProcessing}
          loadingLabel={device.is_active ? 'Deactivating...' : 'Activating...'}
          aria-label={`${device.is_active ? 'Deactivate' : 'Activate'} device ${device.name || device.id}`}
          onClick={() => toggle(device.id, device.is_active)}
        >
          {device.is_active ? 'Deactivate' : 'Activate'}
        </AsyncButton>
      </td>
    </tr>
  );
});

VpnDeviceRow.displayName = 'VpnDeviceRow';

const VpnDeviceList = () => {
  const { confirm, confirmDialog } = useConfirm();

  usePageTitle(
    `VPN Devices | ${COMPANY_NAME}`,
    `Manage provisioned client VPN devices, active tunnel nodes, and device permissions for ${COMPANY_NAME}.`
  );

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    searchInput,
    onSearchChange,
    clearFilters,
    isFiltered,
    params,
    filterConfigs,
  } = useTableQuery({ filters: FILTERS });

  const { data, isLoading, isError, error, refetch } = useVpnDevices(params);

  const devices = data?.data || [];
  const { totalCount, totalPages } = getPaginationTotals(data, pageSize);

  const {
    mutate: toggleDeviceStatus,
    isPending: isToggling,
    variables: togglingVariables,
  } = useToggleVpnDeviceStatus();

  // ID of the device whose toggle is in flight (for per-row processing state)
  const togglingId = isToggling ? togglingVariables?.id : null;

  const handleToggle = useCallback(
    async (id, currentStatus) => {
      const actionLabel = currentStatus ? 'deactivate' : 'activate';
      const capitalizedLabel = actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1);

      const isConfirmed = await confirm({
        title: `${capitalizedLabel} Device`,
        message: `Are you sure you want to ${actionLabel} this VPN device?`,
        confirmText: capitalizedLabel,
        confirmVariant: currentStatus ? 'danger' : 'primary',
      });

      if (!isConfirmed) return;

      toggleDeviceStatus({ id, isActive: currentStatus });
    },
    [confirm, toggleDeviceStatus]
  );

  const renderRow = useCallback(
    (device) => (
      <VpnDeviceRow
        key={device.id}
        device={device}
        processingId={togglingId}
        toggle={handleToggle}
      />
    ),
    [handleToggle, togglingId]
  );

  return (
    <Container className="py-5">
      {confirmDialog}
      <PageHeader
        title="VPN Devices"
        description="Monitor client device endpoints and manage status flags."
      />

      <TableFiltersBar
        searchInput={searchInput}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search by UUID..."
        onClear={clearFilters}
        isClearDisabled={isLoading || !isFiltered}
        filters={filterConfigs}
      />

      {isError && <StatusAlert message={error} onRetry={refetch} />}

      <DataTable
        columns={TABLE_COLUMNS}
        data={devices}
        loading={isLoading}
        renderRow={renderRow}
        emptyMessage="No active VPN device records matched that filter criteria."
      />

      <DefaultPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        loading={isLoading}
      />
    </Container>
  );
};

export default VpnDeviceList;
