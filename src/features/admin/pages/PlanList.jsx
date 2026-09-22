import React, { useCallback } from 'react';
import { Badge, Button, Container, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useConfirm } from '@/hooks/useConfirm';
import { usePlans, useTogglePlanStatus } from '@/features/admin/hooks/usePlans';
import { DataTable } from '@/components/DataTable';
import { StatusAlert } from '@/components/StatusAlert';
import { PageHeader } from '../components/ListHeader';
import { formatCurrencyAmount } from '@/utils/currencyFormatter';
import { COMPANY_NAME } from '@/utils/config';

const TABLE_COLUMNS = [
  { header: 'Plan Name & Tier' },
  { header: 'Price / Cycle' },
  { header: 'Devices' },
  { header: 'Features' },
  { header: 'Badges' },
  { header: 'Status' },
  { header: 'Actions', className: 'text-end' },
];

const PlanRow = React.memo(({ plan, processingId, toggle }) => {
  const isProcessing = processingId === plan.id;

  return (
    <tr className={!plan.enabled ? 'text-muted' : ''}>
      <td>
        <div className="fw-bold">
          <Link to={`/admin/plans/${plan.id}`} className="text-primary text-decoration-none">
            {plan.name}
          </Link>
        </div>
        <div className="text-muted small text-uppercase font-monospace">
          Tier: <span className="fw-medium text-body">{plan.tier}</span>
        </div>
      </td>

      <td className="font-monospace fw-bold text-body">
        {formatCurrencyAmount(plan.price_usd, 'USD')}
        <div className="text-muted fw-normal small">
          {plan.billing_cycle} ({plan.duration_in_days}d)
        </div>
      </td>

      <td className="font-monospace">
        {plan.max_devices} {plan.max_devices === 1 ? 'device' : 'devices'}
      </td>

      <td className="text-secondary small">
        {Array.isArray(plan.features) && plan.features.length > 0 ? (
          <span title={plan.features.join(', ')}>
            {plan.features.length} {plan.features.length === 1 ? 'feature' : 'features'}
          </span>
        ) : (
          '—'
        )}
      </td>

      <td>
        <div className="d-flex flex-wrap gap-1 align-items-center">
          {plan.popular && (
            <Badge bg="warning" className="text-dark small">
              ★ Popular
            </Badge>
          )}
          {plan.savings && (
            <Badge bg="info" className="text-dark small">
              Save {plan.savings}%
            </Badge>
          )}
          {!plan.popular && !plan.savings && <span className="text-muted small">—</span>}
        </div>
      </td>

      <td>
        <Badge
          bg={plan.enabled ? 'success' : 'secondary'}
          className="text-uppercase small rounded-3"
        >
          {plan.enabled ? 'Active' : 'Disabled'}
        </Badge>
      </td>

      <td className="text-end">
        <Button
          variant={plan.enabled ? 'outline-danger' : 'success'}
          size="sm"
          className="fw-bold shadow-sm rounded-3"
          disabled={isProcessing}
          onClick={() => toggle({ id: plan.id, enabled: plan.enabled })}
        >
          {isProcessing ? (
            <>
              <Spinner size="sm" animation="border" className="me-1" /> Saving...
            </>
          ) : plan.enabled ? (
            'Disable'
          ) : (
            'Enable'
          )}
        </Button>
      </td>
    </tr>
  );
});

PlanRow.displayName = 'PlanRow';

const PlanList = () => {
  const { confirm, confirmDialog } = useConfirm();

  usePageTitle(`Plans Management | ${COMPANY_NAME}`);

  // The admin plans endpoint has no pagination (it returns every plan), so any
  // skip/limit params are meaningless — pass none.
  const { data, isLoading, isError, error, refetch } = usePlans();

  const {
    mutate: togglePlanStatus,
    isPending: isToggling,
    variables: togglingVariables,
  } = useTogglePlanStatus();

  // ID of the plan whose toggle is in flight (for per-row processing state)
  const processingId = isToggling ? togglingVariables?.id : null;

  const handleToggle = useCallback(
    async ({ id, enabled }) => {
      const targetAction = enabled ? 'disable' : 'enable';
      const capitalizedAction = targetAction.charAt(0).toUpperCase() + targetAction.slice(1);

      const isConfirmed = await confirm({
        title: `${capitalizedAction} Subscription Plan`,
        message: `Are you sure you want to ${targetAction} this plan?`,
        confirmText: `${capitalizedAction} Plan`,
        confirmVariant: enabled ? 'danger' : 'success',
      });

      if (!isConfirmed) return;

      togglePlanStatus({ id, enabled });
    },
    [confirm, togglePlanStatus]
  );

  const renderRow = useCallback(
    (plan) => (
      <PlanRow key={plan.id} plan={plan} processingId={processingId} toggle={handleToggle} />
    ),
    [handleToggle, processingId]
  );

  // Shape normalized to a bare array inside usePlans' queryFn.
  const plansList = data ?? [];

  return (
    <Container className="py-5">
      {confirmDialog}
      <PageHeader
        title="Subscription Plans"
        description="Provision billing profiles and manage tier availability."
      >
        <Link to="/admin/plans/new">
          <Button variant="primary" className="fw-bold shadow-sm rounded-3">
            ➕ Create New Plan
          </Button>
        </Link>
      </PageHeader>

      {isError && (
        <div className="mb-4">
          <StatusAlert message={error} onRetry={refetch} />
        </div>
      )}

      <DataTable
        columns={TABLE_COLUMNS}
        data={plansList}
        loading={isLoading}
        renderRow={renderRow}
        emptyMessage="No subscription plans found."
      />
    </Container>
  );
};

export default PlanList;
