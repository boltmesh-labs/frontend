import React, { useCallback } from 'react';
import { Badge, Button, Container, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTableQuery } from '@/hooks/useTableQuery';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getPaginationTotals } from '@/utils/pagination';
import { useConfirm } from '@/hooks/useConfirm';
import { useVpnRegions, useToggleVpnRegionStatus } from '@/features/admin/hooks/useVpnRegions';
import { DataTable } from '@/components/DataTable';
import { StatusAlert } from '@/components/StatusAlert';
import { DefaultPagination } from '@/components/DefaultPagination';
import { TableFiltersBar } from '@/components/TableFiltersBar';
import { StatusBadge } from '@/components/StatusBadge';
import { PageHeader } from '../components/ListHeader';
import { VPN_REGION_STATES } from '@/constants/statuses';
import { formatDate } from '@/utils/dateFormatter';

const TABLE_COLUMNS = [
  { header: 'Region' },
  { header: 'Country' },
  { header: 'Status' },
  { header: 'Created' },
  { header: 'Updated' },
];

// Values feed the is_active query param through the paramValue transform
// below; both come from the shared region-state vocabulary.
const ACTIVE_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Active', value: VPN_REGION_STATES.active },
  { label: 'Inactive', value: VPN_REGION_STATES.inactive },
];

const FILTERS = [
  {
    key: 'is_active',
    options: ACTIVE_OPTIONS,
    ariaLabel: 'Filter by region active status',
    paramValue: (value) => value === 'active',
  },
];

const REGION_STATUS_VARIANTS = {
  [VPN_REGION_STATES.active]: 'success',
  [VPN_REGION_STATES.inactive]: 'secondary',
};

const VpnRegionRow = React.memo(({ region, processingId, toggle }) => {
  const isUpdating = processingId === region.id;

  return (
    <tr className="align-middle">
      <td>
        <Link
          to={`/admin/vpn-regions/${region.id}`}
          className="text-decoration-none text-primary fw-bold"
        >
          🌐 {region.name}
        </Link>
        <div className="text-muted small font-monospace">{region.id}</div>
      </td>
      <td>
        <Badge bg="secondary" className="px-2 py-1 fs-7">
          {region.country_code}
        </Badge>
      </td>
      <td>
        <Form.Check
          type="switch"
          id={`active-switch-${region.id}`}
          checked={Boolean(region.is_active)}
          disabled={isUpdating}
          onChange={() => toggle({ id: region.id, isActive: region.is_active })}
          aria-label={`Toggle active status for ${region.name}`}
          label={
            <StatusBadge
              status={region.is_active ? 'active' : 'inactive'}
              variantMap={REGION_STATUS_VARIANTS}
            />
          }
          className="d-inline-flex align-items-center gap-2 pointer-switch"
        />
      </td>
      <td className="small font-monospace text-muted">{formatDate(region.created_at)}</td>
      <td className="small font-monospace text-muted">{formatDate(region.updated_at)}</td>
    </tr>
  );
});

VpnRegionRow.displayName = 'VpnRegionRow';

const VpnRegionList = () => {
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
  } = useTableQuery({ filters: FILTERS, pageSize: 20, debounceMs: 350 });

  const { data, isLoading, isError, error, refetch } = useVpnRegions(params);

  const regionsList = data?.data || [];
  const { totalCount, totalPages } = getPaginationTotals(data, pageSize);

  const { confirm, confirmDialog } = useConfirm();

  const {
    mutate: toggleRegionStatus,
    isPending: isToggling,
    variables: togglingVariables,
  } = useToggleVpnRegionStatus();

  // ID of the region whose toggle is in flight (for per-row processing state)
  const processingId = isToggling ? togglingVariables?.id : null;

  const handleToggleActive = useCallback(
    async ({ id, isActive }) => {
      const actionLabel = isActive ? 'deactivate' : 'activate';
      const capitalizedLabel = actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1);

      const isConfirmed = await confirm({
        title: `${capitalizedLabel} Region`,
        message: `Are you sure you want to ${actionLabel} this VPN region?`,
        confirmText: capitalizedLabel,
        confirmVariant: isActive ? 'danger' : 'primary',
      });

      if (!isConfirmed) return;

      toggleRegionStatus({ id, isActive });
    },
    [confirm, toggleRegionStatus]
  );

  const renderRow = useCallback(
    (region) => (
      <VpnRegionRow
        key={region.id}
        region={region}
        toggle={handleToggleActive}
        processingId={processingId}
      />
    ),
    [handleToggleActive, processingId]
  );

  usePageTitle('VPN Regions');

  return (
    <Container className="py-5">
      <PageHeader
        title="VPN Region Management"
        description="Configure regions and their operational status."
      >
        <Button
          as={Link}
          to="/admin/vpn-regions/new"
          variant="primary"
          className="fw-bold px-4 shadow-sm"
        >
          ➕ Create New Region
        </Button>
      </PageHeader>

      {confirmDialog}

      {isError && (
        <div className="mb-4">
          <StatusAlert message={error} onRetry={refetch} />
        </div>
      )}

      <TableFiltersBar
        searchInput={searchInput}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search by region name or id..."
        filters={filterConfigs}
        onClear={clearFilters}
        isClearDisabled={isLoading || !isFiltered}
      />

      <DataTable
        columns={TABLE_COLUMNS}
        data={regionsList}
        loading={isLoading}
        renderRow={renderRow}
        emptyMessage="No VPN Regions registered matching criteria."
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

export default VpnRegionList;
