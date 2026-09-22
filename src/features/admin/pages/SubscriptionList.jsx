import React, { useCallback } from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTableQuery } from '@/hooks/useTableQuery';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getPaginationTotals } from '@/utils/pagination';
import { useSubscriptions } from '@/features/admin/hooks/useSubscriptions';
import { formatDate } from '@/utils/dateFormatter';
import { DataTable } from '@/components/DataTable';
import { DefaultPagination } from '@/components/DefaultPagination';
import { StatusAlert } from '@/components/StatusAlert';
import { SubscriptionStatusBadge } from '@/components/SubscriptionStatusBadge';
import { TableFiltersBar } from '@/components/TableFiltersBar';
import { PageHeader } from '../components/ListHeader';
import { SUBSCRIPTION_STATUSES } from '@/constants/statuses';

const TABLE_COLUMNS = [
  { header: 'Subscription' },
  { header: 'Assigned Plan' },
  { header: 'Status' },
  { header: 'Started On' },
  { header: 'Expires On' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: SUBSCRIPTION_STATUSES.active, label: 'Active' },
  { value: SUBSCRIPTION_STATUSES.trialing, label: 'Trialing' },
  { value: SUBSCRIPTION_STATUSES.grace_period, label: 'Grace Period' },
  { value: SUBSCRIPTION_STATUSES.past_due, label: 'Past Due' },
  { value: SUBSCRIPTION_STATUSES.canceled, label: 'Canceled' },
  { value: SUBSCRIPTION_STATUSES.expired, label: 'Expired' },
  { value: SUBSCRIPTION_STATUSES.pending, label: 'Pending' },
];

const FILTERS = [
  {
    key: 'status',
    options: STATUS_OPTIONS,
    ariaLabel: 'Filter by subscription status',
    paramKey: 'subscription_status',
  },
];

const SubscriptionRow = React.memo(({ subscription }) => {
  const planNameDisplay = subscription.plan?.name || `Plan #${subscription.plan_id ?? 'N/A'}`;
  const status = subscription.status;

  return (
    <tr>
      <td className="fw-bold font-monospace small text-break">
        <Link
          to={`/admin/subscriptions/${subscription.id}`}
          className="text-primary text-decoration-none"
          title={`View subscription ${subscription.id}`}
        >
          {subscription.id}
        </Link>
      </td>
      <td>
        <span className="fw-bold text-body">{planNameDisplay}</span>
      </td>
      <td>
        <SubscriptionStatusBadge status={status} />
      </td>
      <td className="text-muted font-monospace">{formatDate(subscription.started_at)}</td>
      <td className="text-muted font-monospace fw-semibold">
        {formatDate(subscription.expires_at)}
      </td>
    </tr>
  );
});

SubscriptionRow.displayName = 'SubscriptionRow';

const SubscriptionList = () => {
  usePageTitle('Subscription Management');

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

  const { data, isLoading, isError, error, refetch } = useSubscriptions(params);

  const subscriptions = data?.data || [];
  const { totalCount, totalPages } = getPaginationTotals(data, pageSize);

  const renderRow = useCallback(
    (subscription) => <SubscriptionRow key={subscription.id} subscription={subscription} />,
    []
  );

  return (
    <Container className="py-5">
      <PageHeader
        title="Subscription Management"
        description="Manage user subscriptions, track plan statuses, and view billing history."
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
        data={subscriptions}
        loading={isLoading}
        renderRow={renderRow}
        emptyMessage="No subscriptions found matching the selected criteria."
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

export default SubscriptionList;
