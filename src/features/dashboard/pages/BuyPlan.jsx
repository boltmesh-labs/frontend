import React, { useCallback, useMemo } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePublicPlans } from '@/features/dashboard/hooks/useDashboard';
import { formatCurrencyAmount } from '@/utils/currencyFormatter';
import { COMPANY_NAME } from '@/utils/config';
import { getApiError } from '@/utils/errorHandler';

const PlanCard = React.memo(({ plan, onPurchase }) => {
  const featureList = plan.features || [];
  const isPopular = plan.popular;

  return (
    <Col lg={4} md={6} className="mb-4 d-flex align-items-stretch">
      <Card
        className={`shadow-sm h-100 w-100 text-center border rounded-3 overflow-hidden d-flex flex-column position-relative ${
          isPopular ? 'border-2 border-primary' : ''
        }`}
      >
        {isPopular && (
          <Badge
            bg="primary"
            className="position-absolute top-0 end-0 m-2 px-3 py-2 text-uppercase"
            style={{ zIndex: 1 }}
          >
            Most Popular
          </Badge>
        )}

        <div
          className={`py-3 flex-grow-0 ${
            isPopular ? 'bg-primary text-white' : 'bg-body-secondary text-body-emphasis'
          }`}
        >
          <Card.Title className="mb-0 h4">{plan.name}</Card.Title>
        </div>

        <Card.Body className="d-flex flex-column p-4 flex-grow-1">
          <Card.Text className="text-body-secondary flex-grow-0 mb-3">{plan.description}</Card.Text>

          <div className="p-2 rounded mb-4 d-flex justify-content-around text-body-secondary small border flex-grow-0">
            <div>
              📅 <strong>{plan.duration_in_days}</strong> Days Access
            </div>
            <div className="border-end my-1"></div>
            <div>
              📱 Up to <strong>{plan.max_devices}</strong>{' '}
              {plan.max_devices === 1 ? 'Device' : 'Devices'}
            </div>
          </div>

          <ul className="list-unstyled text-start flex-grow-1 mb-4">
            {featureList.map((feature, i) => (
              <li key={`${i}-${feature}`} className="mb-2 text-body" style={{ fontSize: '0.9rem' }}>
                ✅ {feature.trim()}
              </li>
            ))}
          </ul>

          <div className="mt-auto border-top pt-3 mb-3 flex-grow-0">
            <h3 className="mb-1 fw-bold text-body-emphasis">
              {formatCurrencyAmount(plan.price_usd, 'usd')}
            </h3>
            <span className="text-body-secondary small">
              {plan.billing_cycle ? `${plan.billing_cycle} payment` : 'One-time payment'}
            </span>
            {plan.savings && (
              <div className="mt-1">
                <Badge bg="success" className="fw-normal">
                  Save {plan.savings}%
                </Badge>
              </div>
            )}
          </div>

          <Button
            variant={isPopular ? 'primary' : 'outline-primary'}
            className="w-100 py-2 fw-bold shadow-sm mt-2 flex-grow-0"
            onClick={() => onPurchase(plan)}
          >
            Select Plan
          </Button>
        </Card.Body>
      </Card>
    </Col>
  );
});

PlanCard.displayName = 'PlanCard';

const BuyPlan = () => {
  const navigate = useNavigate();

  usePageTitle(
    `Purchase VPN Plan | ${COMPANY_NAME}`,
    `Choose an optimized billing option to secure your high-speed access keys on the ${COMPANY_NAME} network.`
  );

  const { data: rawPlans, isLoading: plansLoading, isError: plansError, error } = usePublicPlans();

  // Shape normalized to a bare array inside the queryFn.
  const plans = useMemo(() => rawPlans?.filter((p) => p.enabled) ?? [], [rawPlans]);

  const handlePurchase = useCallback(
    (plan) => {
      if (!plan?.id) return;
      navigate(`/checkout/${plan.id}`);
    },
    [navigate]
  );

  return (
    <Container className="py-4">
      <div className="text-center mb-5">
        <h2 className="fw-bold text-body-emphasis mb-2">Choose a VPN Plan</h2>
        <p className="text-body-secondary">Select an optimized configuration option below.</p>
      </div>

      {plansLoading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" className="mb-2" />
          <p className="text-body-secondary">Loading available plans...</p>
        </div>
      ) : plansError ? (
        <Alert variant="danger" className="shadow-sm text-center max-w-md mx-auto">
          {getApiError(error, 'Failed to load available plans.')}
        </Alert>
      ) : plans.length === 0 ? (
        <Alert variant="info" className="shadow-sm text-center max-w-md mx-auto">
          No plans are currently available.
        </Alert>
      ) : (
        <Row className="justify-content-center align-items-stretch">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onPurchase={handlePurchase} />
          ))}
        </Row>
      )}

      <div className="d-flex justify-content-start mt-5">
        <Button variant="outline-secondary" onClick={() => navigate('/dashboard')}>
          &larr; Return to Dashboard
        </Button>
      </div>
    </Container>
  );
};

export default BuyPlan;
