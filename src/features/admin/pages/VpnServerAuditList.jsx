import React, { useCallback } from 'react';
import { Badge, Container } from 'react-bootstrap';
import { useTableQuery } from '@/hooks/useTableQuery';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getPaginationTotals } from '@/utils/pagination';
import { useVpnNodeAudit } from '@/features/admin/hooks/useVpnNodeAudit';
import { DataTable } from '@/components/DataTable';
import { StatusAlert } from '@/components/StatusAlert';
import { DefaultPagination } from '@/components/DefaultPagination';
import { TableFiltersBar } from '@/components/TableFiltersBar';
import { PageHeader } from '../components/ListHeader';
import { formatDate } from '@/utils/dateFormatter';
import { NODE_REGISTRATION_STATUSES, NODE_REGISTRATION_AUTH_METHODS } from '@/constants/statuses';

const TABLE_COLUMNS = [
  { header: 'Instance ID' },
  { header: 'Region' },
  { header: 'Auth Method' },
  { header: 'Status' },
  { header: 'IP Address' },
  { header: 'Timestamp' },
];

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Success', value: NODE_REGISTRATION_STATUSES.SUCCESS },
  { label: 'Invalid Secret', value: NODE_REGISTRATION_STATUSES.INVALID_SECRET },
  { label: 'IID Verification Failed', value: NODE_REGISTRATION_STATUSES.IID_VERIFICATION_FAILED },
  { label: 'Expired', value: NODE_REGISTRATION_STATUSES.EXPIRED },
  { label: 'Region Conflict', value: NODE_REGISTRATION_STATUSES.REGION_CONFLICT },
  { label: 'Tunnel Address Overlap', value: NODE_REGISTRATION_STATUSES.TUNNEL_ADDRESS_OVERLAP },
  { label: 'Region Not Found', value: NODE_REGISTRATION_STATUSES.REGION_NOT_FOUND },
  { label: 'Internal Error', value: NODE_REGISTRATION_STATUSES.INTERNAL_ERROR },
];

const AUTH_METHOD_OPTIONS = [
  { label: 'All Methods', value: '' },
  { label: 'AWS IID', value: NODE_REGISTRATION_AUTH_METHODS.AWS_IID },
  { label: 'Bootstrap Secret', value: NODE_REGISTRATION_AUTH_METHODS.BOOTSTRAP_SECRET },
  { label: 'Failed', value: NODE_REGISTRATION_AUTH_METHODS.FAILED },
];

const FILTERS = [
  {
    key: 'status',
    options: STATUS_OPTIONS,
    ariaLabel: 'Filter by registration status',
  },
  {
    key: 'auth_method',
    options: AUTH_METHOD_OPTIONS,
    ariaLabel: 'Filter by authentication method',
  },
];

const getStatusVariant = (status) => {
  switch (status) {
    case NODE_REGISTRATION_STATUSES.SUCCESS:
      return 'success';
    case NODE_REGISTRATION_STATUSES.INVALID_SECRET:
    case NODE_REGISTRATION_STATUSES.EXPIRED:
      return 'warning';
    case NODE_REGISTRATION_STATUSES.IID_VERIFICATION_FAILED:
      return 'danger';
    default:
      return 'secondary';
  }
};

const getAuthMethodVariant = (method) => {
  switch (method) {
    case NODE_REGISTRATION_AUTH_METHODS.AWS_IID:
      return 'info';
    case NODE_REGISTRATION_AUTH_METHODS.BOOTSTRAP_SECRET:
      return 'primary';
    default:
      return 'secondary';
  }
};

const VpnNodeAuditRow = React.memo(({ audit }) => {
  return (
    <tr className="align-middle">
      <td className="font-monospace text-body fw-bold">{audit.server_name || '—'}</td>
      <td>
        <span className="font-monospace text-muted">{audit.region_id || '—'}</span>
      </td>
      <td>
        <Badge bg={getAuthMethodVariant(audit.auth_method)} className="px-2 py-1 fs-7">
          {audit.auth_method}
        </Badge>
      </td>
      <td>
        <Badge bg={getStatusVariant(audit.status)} className="px-2 py-1 fs-7">
          {audit.status}
        </Badge>
      </td>
      <td>
        <span className="font-monospace text-muted">{audit.ip_address || '—'}</span>
      </td>
      <td>
        <span className="text-body">{formatDate(audit.created_at)}</span>
      </td>
    </tr>
  );
});

VpnNodeAuditRow.displayName = 'VpnNodeAuditRow';

const VpnNodeAuditList = () => {
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

  const { data, isLoading, isError, error, refetch } = useVpnNodeAudit(params);

  const auditsList = data?.data || [];
  const { totalCount, totalPages } = getPaginationTotals(data, pageSize);

  const renderRow = useCallback((audit) => <VpnNodeAuditRow key={audit.id} audit={audit} />, []);

  usePageTitle('Node Registration Audit');

  return (
    <Container className="py-5">
      <PageHeader
        title="Node Registration Audit"
        description="Audit trail for node registration attempts, including successes, failures, and authentication methods."
      />

      {isError && (
        <div className="mb-4">
          <StatusAlert message={error} onRetry={refetch} />
        </div>
      )}

      <TableFiltersBar
        searchInput={searchInput}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search by instance ID or region..."
        filters={filterConfigs}
        onClear={clearFilters}
        isClearDisabled={isLoading || !isFiltered}
      />

      <DataTable
        columns={TABLE_COLUMNS}
        data={auditsList}
        loading={isLoading}
        renderRow={renderRow}
        emptyMessage="No registration audit events found."
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

export default VpnNodeAuditList;
