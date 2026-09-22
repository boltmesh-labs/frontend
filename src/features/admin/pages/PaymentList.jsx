import React, { useCallback } from 'react';
import { Button, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTableQuery } from '@/hooks/useTableQuery';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getPaginationTotals } from '@/utils/pagination';
import { usePayments } from '@/features/admin/hooks/usePayments';
import { formatCurrencyAmount } from '@/utils/currencyFormatter';
import { formatDate } from '@/utils/dateFormatter';
import { getMethodDisplay } from '@/utils/methodDisplay';
import { copyToClipboard } from '@/utils/clipboard';
import { DataTable } from '@/components/DataTable';
import { DefaultPagination } from '@/components/DefaultPagination';
import { PaymentStatusBadge } from '@/components/PaymentStatusBadge';
import { StatusAlert } from '@/components/StatusAlert';
import { TableFiltersBar } from '@/components/TableFiltersBar';
import { PageHeader } from '../components/ListHeader';
import { PAYMENT_STATUSES } from '@/constants/statuses';

const TABLE_COLUMNS = [
  { header: 'Payment' },
  { header: 'Invoice' },
  { header: 'Method' },
  { header: 'TXID' },
  { header: 'Amount' },
  { header: 'Status' },
  { header: 'Created' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: PAYMENT_STATUSES.processing, label: 'Processing' },
  { value: PAYMENT_STATUSES.succeeded, label: 'Succeeded' },
  { value: PAYMENT_STATUSES.failed, label: 'Failed' },
  { value: PAYMENT_STATUSES.refunded, label: 'Refunded' },
  { value: PAYMENT_STATUSES.refund_required, label: 'Refund Required' },
];

const FILTERS = [
  {
    key: 'status',
    options: STATUS_OPTIONS,
    ariaLabel: 'Filter by status',
    paramKey: 'payment_status',
  },
];

const PaymentRow = React.memo(({ pay, onCopyTxId }) => {
  const txIdStr = String(pay.external_tx_id || '');
  const formattedTxId =
    txIdStr.length > 12
      ? `${txIdStr.substring(0, 5)}...${txIdStr.substring(txIdStr.length - 6)}`
      : txIdStr;

  const method = pay.invoice?.payment_method;
  const currency = pay.invoice?.currency || 'USD';

  return (
    <tr>
      <td className="fw-bold font-monospace small text-break">
        <Link to={`/admin/payments/${pay.id}`} className="text-primary text-decoration-none">
          {pay.id}
        </Link>
      </td>
      <td className="fw-bold font-monospace small text-break">
        <Link
          to={`/admin/invoices/${pay.invoice_id}`}
          className="text-primary text-decoration-none fw-medium"
        >
          {pay.invoice_id}
        </Link>
      </td>
      <td className="text-nowrap">{getMethodDisplay(method)}</td>
      <td>
        {pay.external_tx_id ? (
          <div className="d-flex align-items-center gap-2">
            <span
              className="font-monospace text-muted"
              title={txIdStr}
              style={{ fontSize: '0.85rem' }}
            >
              {formattedTxId}
            </span>
            <Button
              variant="link"
              size="sm"
              className="p-0 text-decoration-none text-secondary opacity-75 hover-opacity-100"
              onClick={() => onCopyTxId(txIdStr)}
              title="Copy TXID to Clipboard"
            >
              📋
            </Button>
          </div>
        ) : (
          <span className="text-muted text-opacity-50 font-monospace">—</span>
        )}
      </td>
      <td className="font-monospace fw-bold">{formatCurrencyAmount(pay.amount, currency)}</td>
      <td>
        <PaymentStatusBadge status={pay.status} />
        Confirmations: {pay.confirmations ?? 0}
      </td>
      <td className="text-muted">{formatDate(pay.created_at)}</td>
    </tr>
  );
});

PaymentRow.displayName = 'PaymentRow';

const PaymentList = () => {
  usePageTitle('Payments Management');

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

  const { data, isLoading, isError, error, refetch } = usePayments(params);

  const payments = data?.data || [];
  const { totalCount, totalPages } = getPaginationTotals(data, pageSize);

  const renderRow = useCallback(
    (pay) => <PaymentRow key={pay.id} pay={pay} onCopyTxId={copyToClipboard} />,
    []
  );

  return (
    <Container className="py-5">
      <PageHeader
        title="Payments Management"
        description="Audit, trace, and monitor system-wide ledger records."
      />

      <TableFiltersBar
        searchInput={searchInput}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search by TXID or UUID..."
        onClear={clearFilters}
        isClearDisabled={isLoading || !isFiltered}
        filters={filterConfigs}
      />

      {isError && <StatusAlert message={error} onRetry={refetch} />}

      <DataTable
        columns={TABLE_COLUMNS}
        data={payments}
        loading={isLoading}
        renderRow={renderRow}
        emptyMessage="No matching payments found in this ledger profile."
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

export default PaymentList;
