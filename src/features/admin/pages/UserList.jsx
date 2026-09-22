import React, { useCallback } from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { AsyncButton } from '@/components/AsyncButton';
import { useTableQuery } from '@/hooks/useTableQuery';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getPaginationTotals } from '@/utils/pagination';
import { useConfirm } from '@/hooks/useConfirm';
import { useUsers, useToggleUserStatus } from '@/features/admin/hooks/useUsers';
import { DataTable } from '@/components/DataTable';
import { DefaultPagination } from '@/components/DefaultPagination';
import { StatusAlert } from '@/components/StatusAlert';
import { TableFiltersBar } from '@/components/TableFiltersBar';
import { UserRoleBadge, UserStateBadge } from '@/components/UserBadges';
import { PageHeader } from '../components/ListHeader';
import { COMPANY_NAME } from '@/utils/config';
import { USER_ROLES } from '@/constants/roles';

const TABLE_COLUMNS = [
  { header: 'Username' },
  { header: 'Email' },
  { header: 'Access State' },
  { header: 'Assigned Role' },
  { header: 'Actions', className: 'text-center' },
];

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: USER_ROLES.user, label: 'User' },
  { value: USER_ROLES.admin, label: 'Admin' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const FILTERS = [
  {
    key: 'status',
    options: STATUS_OPTIONS,
    ariaLabel: 'Filter by user status',
    paramKey: 'is_active',
    paramValue: (v) => v === 'true',
  },
  {
    key: 'role',
    options: ROLE_OPTIONS,
    ariaLabel: 'Filter by user role',
  },
];

const UserRow = React.memo(({ user, isProcessing, toggle }) => {
  return (
    <tr>
      <td className="fw-bold">
        <Link to={`/admin/users/${user.id}`} className="text-decoration-none text-primary">
          {user.username}
        </Link>
      </td>
      <td className="text-muted font-monospace">{user.email}</td>
      <td>
        <UserStateBadge isActive={user.is_active} />
      </td>
      <td>
        <UserRoleBadge role={user.role} />
      </td>
      <td className="text-end">
        <AsyncButton
          variant={user.is_active ? 'outline-warning' : 'outline-success'}
          size="sm"
          className="px-3 fw-bold shadow-sm"
          loading={isProcessing}
          loadingLabel={user.is_active ? 'Deactivating...' : 'Activating...'}
          aria-label={`${user.is_active ? 'Deactivate' : 'Activate'} account for ${user.username}`}
          onClick={() => toggle(user.id, user.is_active)}
        >
          {user.is_active ? 'Deactivate' : 'Activate'}
        </AsyncButton>
      </td>
    </tr>
  );
});

UserRow.displayName = 'UserRow';

const UserList = () => {
  const { confirm, confirmDialog } = useConfirm();

  usePageTitle(
    `User Management | ${COMPANY_NAME}`,
    `Manage user accounts, privileges, roles, and access status flags for ${COMPANY_NAME}.`
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

  const { data, isLoading, isError, error, refetch } = useUsers(params);

  const users = data?.data || [];
  const { totalCount, totalPages } = getPaginationTotals(data, pageSize);

  const {
    mutate: toggleUserStatus,
    isPending: isToggling,
    variables: toggleVariables,
  } = useToggleUserStatus();

  const handleToggle = useCallback(
    async (id, currentStatus) => {
      const actionLabel = currentStatus ? 'deactivate' : 'activate';
      const capitalizedLabel = actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1);

      const isConfirmed = await confirm({
        title: `${capitalizedLabel} Account`,
        message: `Are you sure you want to ${actionLabel} this user account?`,
        confirmText: capitalizedLabel,
        confirmVariant: currentStatus ? 'danger' : 'primary',
      });

      if (!isConfirmed) return;

      toggleUserStatus({ id, isActive: currentStatus });
    },
    [confirm, toggleUserStatus]
  );

  const renderRow = useCallback(
    (user) => (
      <UserRow
        key={user.id}
        user={user}
        // Only the row whose mutation is in flight spins; a global flag made
        // every button on the page look busy during any single toggle.
        isProcessing={isToggling && toggleVariables?.id === user.id}
        toggle={handleToggle}
      />
    ),
    [handleToggle, isToggling, toggleVariables]
  );

  return (
    <Container className="py-5">
      {confirmDialog}
      <PageHeader
        title="User Accounts"
        description="Manage user accounts, assign roles, and update system access permissions."
      />

      <TableFiltersBar
        searchInput={searchInput}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search by username, email, or UUID..."
        onClear={clearFilters}
        isClearDisabled={isLoading || !isFiltered}
        filters={filterConfigs}
      />

      {isError && <StatusAlert message={error} onRetry={refetch} />}

      <DataTable columns={TABLE_COLUMNS} data={users} loading={isLoading} renderRow={renderRow} />

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

export default UserList;
