import React, { useCallback } from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTableQuery } from '@/hooks/useTableQuery';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getPaginationTotals } from '@/utils/pagination';
import { usePlanMap } from '@/hooks/usePlanMap';
import { useInvoices } from '@/features/admin/hooks/useInvoices';
import { usePlans } from '@/features/admin/hooks/usePlans';
import { formatDate } from '@/utils/dateFormatter';
import { getMethodDisplay } from '@/utils/methodDisplay';
import { DataTable } from '@/components/DataTable';
import { DefaultPagination } from '@/components/DefaultPagination';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import { StatusAlert } from '@/components/StatusAlert';
import { TableFiltersBar } from '@/components/TableFiltersBar';
import { PageHeader } from '../components/ListHeader';
import { COMPANY_NAME } from '@/utils/config';
import { INVOICE_STATUSES } from '@/constants/statuses';
import { formatCurrencyAmount } from '@/utils/currencyFormatter';

const TABLE_COLUMNS = [
  { header: 'Invoice' },
  { header: 'Plan' },
  { header: 'Payment Method' },
  { header: 'Status' },
  { header: 'Paid' },
  { header: 'Exchange Rate' },
  { header: 'Created' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: INVOICE_STATUSES.pending, label: 'Pending' },
  { value: INVOICE_STATUSES.paid, label: 'Paid' },
  { value: INVOICE_STATUSES.confirming, label: 'Confirming' },
  { value: INVOICE_STATUSES.expired, label: 'Expired' },
  { value: INVOICE_STATUSES.partially_paid, label: 'Partially Paid' },
  { value: INVOICE_STATUSES.expired_partially_paid, label: 'Expired Partially Paid' },
  { value: INVOICE_STATUSES.canceled, label: 'Canceled' },
  { value: INVOICE_STATUSES.failed, label: 'Failed' },
  { value: INVOICE_STATUSES.refund_required, label: 'Refund Required' },
];

const METHOD_OPTIONS = [
  { value: '', label: 'All Methods' },
  { value: 'lightning', label: 'Lightning' },
  { value: 'monero', label: 'Monero' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'credit_card', label: 'Credit Card' },
];

const FILTERS = [
  {
    key: 'status',
    options: STATUS_OPTIONS,
    ariaLabel: 'Filter by status',
    paramKey: 'invoice_status',
  },
  {
    key: 'method',
    options: METHOD_OPTIONS,
    ariaLabel: 'Filter by payment method',
    paramKey: 'payment_method',
  },
];

const InvoiceRow = React.memo(({ invoice, planMap }) => {
  const planName = planMap.get(invoice.plan_id)?.name;

  return (
    <tr>
      <td className="fw-bold font-monospace small text-wrap text-break">
        <Link to={`/admin/invoices/${invoice.id}`} className="text-primary text-decoration-none">
          {String(invoice.id)}
        </Link>
      </td>
      <td className="fw-bold text-secondary">{planName || `Plan #${invoice.plan_id}`}</td>
      <td className="text-nowrap">{getMethodDisplay(invoice.payment_method)}</td>
      <td>
        <InvoiceStatusBadge status={invoice.status} />
      </td>
      <td className="font-monospace fw-bold">
        {formatCurrencyAmount(invoice.amount_paid, invoice.currency)}
      </td>
      <td className="font-monospace fw-bold">
        {invoice.exchange_rate
          ? `1 ${invoice.currency} = ${Math.round(Number(invoice.exchange_rate))} ${invoice.fiat_currency.toUpperCase()}`
          : 'N/A'}
      </td>
      <td className="small text-muted">{formatDate(invoice.created_at)}</td>
    </tr>
  );
});

InvoiceRow.displayName = 'InvoiceRow';

const InvoiceList = () => {
  usePageTitle(
    `Invoice Management | ${COMPANY_NAME}`,
    `Manage user subscription invoices, view transaction amounts, and filter payment records for ${COMPANY_NAME}.`
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

  const { data, isLoading, isError, error, refetch } = useInvoices(params);
  const { data: plans } = usePlans();
  const planMap = usePlanMap(plans);

  const invoices = data?.data || [];
  const { totalCount, totalPages } = getPaginationTotals(data, pageSize);

  const renderRow = useCallback(
    (invoice) => <InvoiceRow key={invoice.id} invoice={invoice} planMap={planMap} />,
    [planMap]
  );

  return (
    <Container className="py-5">
      <PageHeader
        title="Invoices"
        description="Track and manage global user subscription payment records."
      />

      <TableFiltersBar
        searchInput={searchInput}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search by tracking ID or UUID..."
        onClear={clearFilters}
        isClearDisabled={isLoading || !isFiltered}
        filters={filterConfigs}
      />

      {isError && <StatusAlert message={error} onRetry={refetch} />}

      <DataTable
        columns={TABLE_COLUMNS}
        data={invoices}
        loading={isLoading}
        renderRow={renderRow}
        emptyMessage="No active invoice records match your criteria."
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

export default InvoiceList;
