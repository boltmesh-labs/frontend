import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useTableQuery } from '@/hooks/useTableQuery';
import { getPaginationTotals } from '@/utils/pagination';
import { usePlanMap } from '@/hooks/usePlanMap';
import { usePublicPlans, useUserInvoices } from '@/features/dashboard/hooks/useDashboard';
import { DataTable } from '@/components/DataTable';
import { DefaultPagination } from '@/components/DefaultPagination';
import { StatusAlert } from '@/components/StatusAlert';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import { DashboardContainer } from '@/features/dashboard/components/DashboardContainer';
import { DashboardHeader } from '../components/DashboardHeader';
import { formatDate } from '@/utils/dateFormatter';
import { getMethodDisplay } from '@/utils/methodDisplay';
import { COMPANY_NAME } from '@/utils/config';

const TABLE_COLUMNS = [
  { header: 'Invoice' },
  { header: 'Payment Method' },
  { header: 'Plan' },
  { header: 'Status' },
  { header: 'Date' },
];

const InvoiceRow = React.memo(({ inv, planMap }) => {
  const planName = planMap.get(inv.plan_id)?.name;
  return (
    <tr>
      <td className="font-monospace fw-bold text-break">
        <Link to={`/invoices/${inv.id}`} className="text-primary text-decoration-none">
          {inv.id}
        </Link>
      </td>
      <td className="fw-bold text-body">{getMethodDisplay(inv.payment_method)}</td>
      <td className="fw-bold text-secondary">{planName || `Plan #${inv.plan_id}`}</td>
      <td>
        <InvoiceStatusBadge status={inv.status} />
      </td>
      <td className="text-secondary">{formatDate(inv.created_at)}</td>
    </tr>
  );
});

InvoiceRow.displayName = 'InvoiceRow';

const InvoiceList = () => {
  usePageTitle(
    `Invoices & Billing History | ${COMPANY_NAME}`,
    'Review your subscription plan details, active invoices, and past payments.'
  );

  // GET /v1/invoices supports skip/limit pagination only.
  const { currentPage, setCurrentPage, pageSize, params } = useTableQuery();

  const { data, isLoading, isError, error, refetch } = useUserInvoices(params);
  const { data: plans } = usePublicPlans();
  const planMap = usePlanMap(plans);

  const invoices = data?.data || [];
  const { totalCount, totalPages } = getPaginationTotals(data, pageSize);

  const renderRow = useCallback(
    (inv) => <InvoiceRow key={inv.id} inv={inv} planMap={planMap} />,
    [planMap]
  );

  return (
    <DashboardContainer>
      <DashboardHeader
        title="Invoices & Billing"
        subtitle="Review payment receipts and transaction history."
      />

      {isError && <StatusAlert message={error} onRetry={refetch} />}

      <DataTable
        columns={TABLE_COLUMNS}
        data={invoices}
        loading={isLoading}
        renderRow={renderRow}
      />

      <DefaultPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        loading={isLoading}
      />
    </DashboardContainer>
  );
};

export default InvoiceList;
