import { useCallback } from 'react';
import { Button, Card, Col, Row } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUserSubscriptions } from '@/features/dashboard/hooks/useDashboard';
import { DashboardContainer } from '@/features/dashboard/components/DashboardContainer';
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader';
import { SubscriptionStatusBadge } from '@/components/SubscriptionStatusBadge';
import { formatCurrencyAmount } from '@/utils/currencyFormatter';
import { formatDate } from '@/utils/dateFormatter';
import { StatusAlert } from '@/components/StatusAlert';
import { DataTable } from '@/components/DataTable';
import { MobileRecordCard } from '@/components/MobileRecordCard';
import { COMPANY_NAME } from '@/utils/config';

const TABLE_COLUMNS = [
  { header: 'Plan' },
  { header: 'Billing Cycle' },
  { header: 'Price' },
  { header: 'Status' },
  { header: 'Expires On' },
  { header: '' },
];

const SubscriptionList = () => {
  const navigate = useNavigate();

  usePageTitle(
    `My Subscriptions | ${COMPANY_NAME}`,
    'Manage your active subscriptions and view billing schedules.'
  );

  const { data, isLoading, isError, error, refetch } = useUserSubscriptions();

  // Shape normalized to a bare array inside useUserSubscriptions' queryFn.
  const subscriptions = data ?? [];

  const renderSubscriptionRow = useCallback(
    (sub) => (
      <tr key={sub.id}>
        <td className="fw-bold text-body">{sub.plan?.name}</td>
        <td className="text-capitalize">{sub.plan?.billing_cycle}</td>
        <td className="font-monospace fw-bold">
          {formatCurrencyAmount(sub.plan?.price_usd, 'USD')}
        </td>
        <td>
          <SubscriptionStatusBadge status={sub.status} />
        </td>
        <td className="text-muted font-monospace">{formatDate(sub.expires_at)}</td>
        <td>
          <Button
            variant="outline-primary"
            size="sm"
            className="fw-bold rounded-3"
            onClick={() => navigate(`/subscriptions/${sub.id}`)}
          >
            Details
          </Button>
        </td>
      </tr>
    ),
    [navigate]
  );

  const renderMobileItem = useCallback(
    (sub) => (
      <MobileRecordCard
        title={sub.plan?.name}
        items={[
          {
            label: 'Billing cycle',
            value: <span className="text-capitalize">{sub.plan?.billing_cycle}</span>,
          },
          { label: 'Price', value: formatCurrencyAmount(sub.plan?.price_usd, 'USD') },
          { label: 'Status', value: <SubscriptionStatusBadge status={sub.status} /> },
          { label: 'Expires on', value: formatDate(sub.expires_at) },
        ]}
        actions={
          <Button
            variant="outline-primary"
            size="sm"
            className="fw-bold rounded-3"
            onClick={() => navigate(`/subscriptions/${sub.id}`)}
          >
            Details
          </Button>
        }
      />
    ),
    [navigate]
  );

  if (isLoading) {
    return (
      <DashboardContainer>
        <div className="d-flex justify-content-center align-items-center py-5">
          <span className="spinner-border text-primary" role="status" />
        </div>
      </DashboardContainer>
    );
  }

  const activeSubscriptionsCount = subscriptions.filter((s) =>
    ['active', 'trialing'].includes(s.status?.toLowerCase())
  ).length;

  return (
    <DashboardContainer>
      <DashboardHeader
        title="Subscriptions"
        subtitle="Manage active plans, review billing schedules, and control your services."
        rightAction={
          <Button
            variant="outline-primary"
            size="sm"
            className="fw-bold px-3 py-2 text-nowrap"
            onClick={() => navigate('/buy-plan')}
          >
            + New Subscription
          </Button>
        }
      />

      {isError && <StatusAlert message={error} onRetry={refetch} />}

      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm rounded-3 p-3">
            <span className="text-muted small fw-bold text-uppercase">Total Subscriptions</span>
            <h3 className="fw-bold mt-1 mb-0">{subscriptions.length}</h3>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm rounded-3 p-3">
            <span className="text-muted small fw-bold text-uppercase">Active Plans</span>
            <h3 className="fw-bold text-success mt-1 mb-0">{activeSubscriptionsCount}</h3>
          </Card>
        </Col>
      </Row>

      <DataTable
        columns={TABLE_COLUMNS}
        data={subscriptions}
        renderRow={renderSubscriptionRow}
        renderMobileItem={renderMobileItem}
        emptyMessage="No active or past subscriptions found."
      />
    </DashboardContainer>
  );
};

export default SubscriptionList;
