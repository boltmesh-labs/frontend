import { useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Container, Row, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { AsyncButton } from '@/components/AsyncButton';
import {
  useCreateInvoice,
  useCryptoPrices,
  useDashboardProfile,
  useFxRate,
  usePlanDetail,
  useSupportedCurrencies,
  useUserSubscriptions,
} from '@/features/dashboard/hooks/useDashboard';
import { resolveActivePlan } from '@/features/dashboard/utils/activePlan';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatCurrencyAmount } from '@/utils/currencyFormatter';
import { getApiError } from '@/utils/errorHandler';
import { COMPANY_NAME } from '@/utils/config';

const Checkout = () => {
  const { planId } = useParams();
  const navigate = useNavigate();

  // Billing currency for this checkout (ISO 4217). Plans stay USD-denominated;
  // picking another currency converts the price at the backend FX rate, re-quotes
  // crypto prices in that fiat, and locks the selection onto the invoice via
  // fiat_currency.
  const [fiatCurrency, setFiatCurrency] = useState('USD');

  // The plan is fetched by route param instead of being carried through
  // navigation state, so refreshes and shared checkout links keep working.
  const { data: plan, isLoading: isPlanLoading, isError: isPlanError } = usePlanDetail(planId);

  const { data: user, isLoading: isUserLoading } = useDashboardProfile();
  const { data: subscriptionData } = useUserSubscriptions();
  const subscriptions = subscriptionData ?? [];
  const activeSubscription =
    user?.active_subscription ??
    subscriptions.find((subscription) =>
      ['active', 'trialing'].includes(subscription?.status?.toLowerCase())
    );

  // Prefer the profile's backend-computed active subscription, while falling
  // back to the list query so trialing subscriptions are not hidden at checkout.
  const activePlan = resolveActivePlan(user, subscriptions);

  // Supported fiat pricing currencies are served by the backend so operators can
  // widen or narrow the list without touching the frontend.
  const { data: supportedCurrencies } = useSupportedCurrencies();

  // Crypto quotes live in the feature hooks layer like every other server call.
  // Keyed by the selected billing currency, so switching re-quotes automatically.
  const { data: cryptoPrices, isError: priceError } = useCryptoPrices(fiatCurrency, {
    enabled: !!plan,
  });

  // USD-per-unit-of-fiat cross rate so the displayed price matches what the
  // invoice will actually charge (the backend converts plan.price_usd at
  // checkout). USD needs no conversion and skips the call entirely.
  const isUsdCheckout = fiatCurrency === 'USD';
  const { data: fxRate, isError: fxRateError } = useFxRate(fiatCurrency, {
    enabled: !!plan && !isUsdCheckout,
  });

  const [paymentMethod, setPaymentMethod] = useState('lightning');
  const [error, setError] = useState(null);

  // Backend serves lowercase codes; the UI speaks uppercase ISO 4217.
  const currencyChoices = useMemo(
    () => (supportedCurrencies?.currencies ?? []).map((code) => String(code).toUpperCase()),
    [supportedCurrencies]
  );

  const createInvoiceMutation = useCreateInvoice();
  const isSubmitting = createInvoiceMutation.isPending;

  usePageTitle(
    `Checkout | ${COMPANY_NAME}`,
    'Review your order configuration adjustments and select your preferred payment settlement channel.'
  );

  // Plan price in the selected billing currency: pass-through for USD,
  // otherwise converted at the backend's locked USD-per-fiat cross rate.
  const convertedFiatPrice = useMemo(() => {
    const price = Number(plan?.price_usd || 0);
    if (!price) return null;
    if (isUsdCheckout) return price;

    const rateToUsd = Number(fxRate?.rate_to_usd);
    if (!rateToUsd || rateToUsd <= 0) return null;
    return Math.round((price / rateToUsd) * 100) / 100;
  }, [plan, isUsdCheckout, fxRate]);

  const estimatedCryptoAmount = useMemo(() => {
    // Crypto quotes are denominated in the selected fiat, so the estimate must
    // divide the *converted* fiat amount — not the raw USD plan price.
    const price = convertedFiatPrice;
    if (!price) return 'Calculating...';

    const bitcoinPrice = cryptoPrices?.bitcoin;
    const moneroPrice = cryptoPrices?.monero;

    if (paymentMethod === 'lightning') {
      if (!bitcoinPrice) return 'Pending Quote...';
      const btcValue = price / bitcoinPrice;
      return formatCurrencyAmount(btcValue, 'btc');
    }

    if (paymentMethod === 'monero') {
      if (!moneroPrice) return 'Pending Quote...';
      const xmrValue = price / moneroPrice;
      return formatCurrencyAmount(xmrValue, 'xmr');
    }

    return 'Pending Quote...';
  }, [convertedFiatPrice, paymentMethod, cryptoPrices]);

  const handlePlaceOrder = () => {
    setError(null);
    createInvoiceMutation.mutate(
      { plan_id: plan.id, payment_method: paymentMethod, fiat_currency: fiatCurrency },
      {
        onSuccess: (invoice) => {
          navigate(`/payment/${invoice.id}`, { replace: true });
        },
        // getApiError stringifies FastAPI validation arrays; rendering the raw
        // detail object as a React child would crash the page.
        onError: (err) =>
          setError(getApiError(err, 'An error occurred while generating your invoice.')),
      }
    );
  };

  if (isPlanLoading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="dark" />
        <p className="text-body-secondary mt-3">Loading plan...</p>
      </Container>
    );
  }

  // Unknown or disabled plan (the backend 404s both): explicit dead end with a
  // way back to the catalog instead of a silent bounce.
  if (isPlanError || !plan) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col lg={6} md={8}>
            <Alert variant="danger" className="shadow-sm text-center">
              This plan is unavailable or no longer offered. Please choose a plan from the catalog.
            </Alert>
            <div className="text-center">
              <Button
                variant="outline-primary"
                className="fw-bold px-4"
                onClick={() => navigate('/buy-plan')}
              >
                Back to Plans
              </Button>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }

  const isSamePlan = activePlan?.id === plan.id;
  const activeSubscriptionExpiresAt = activeSubscription?.expires_at;

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col lg={6} md={8}>
          <Card className="border shadow-sm rounded-3 overflow-hidden">
            <div className="bg-dark py-3 px-4 text-center">
              <h4 className="text-white mb-0 fw-bold">Review & Pay</h4>
            </div>

            <Card.Body className="p-4">
              {error && (
                <Alert variant="danger" className="small py-2 mb-3">
                  {error}
                </Alert>
              )}
              {priceError && (
                <Alert variant="warning" className="small py-2 mb-3">
                  Real-time conversion rates unavailable.
                </Alert>
              )}
              {!isUsdCheckout && fxRateError && (
                <Alert variant="warning" className="small py-2 mb-3">
                  Currency conversion rate unavailable. Please pick USD or try again shortly.
                </Alert>
              )}

              {activePlan && (
                <Alert variant="info" className="mb-4 small border-info">
                  <Alert.Heading className="fs-6 fw-bold mb-1">
                    ℹ️ Active Subscription Detected
                  </Alert.Heading>
                  {isSamePlan ? (
                    <span>
                      You currently have the <strong>{activePlan.name}</strong> plan. Purchasing
                      this plan will <strong>extend your subscription</strong> by{' '}
                      <strong>{plan.duration_in_days} days</strong>.
                    </span>
                  ) : (
                    <span>
                      You currently have the <strong>{activePlan.name}</strong> plan. Switching to{' '}
                      <strong>{plan.name}</strong> will replace your active plan. Any remaining time
                      {activeSubscriptionExpiresAt
                        ? ` (expiring ${new Date(activeSubscriptionExpiresAt).toLocaleDateString()})`
                        : ''}{' '}
                      will be prorated into bonus credit toward your new plan.
                    </span>
                  )}
                </Alert>
              )}

              <h6 className="fw-bold text-uppercase text-muted small mb-2">Order Summary</h6>
              <div className="bg-body-tertiary p-3 rounded border mb-4">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
                  <span className="text-body fw-bold">{plan.name}</span>
                  <span className="text-body font-monospace fw-bold text-end">
                    {convertedFiatPrice !== null
                      ? formatCurrencyAmount(convertedFiatPrice, fiatCurrency)
                      : formatCurrencyAmount(plan.price_usd, 'usd')}
                    {!isUsdCheckout && convertedFiatPrice !== null && (
                      <small className="text-muted d-block">
                        ≈ {formatCurrencyAmount(plan.price_usd, 'usd')}
                      </small>
                    )}
                  </span>
                </div>
                {plan.description && (
                  <small className="text-muted d-block">{plan.description}</small>
                )}
              </div>

              {currencyChoices.length > 0 && (
                <>
                  <h6 className="fw-bold text-uppercase text-muted small mb-2">Billing Currency</h6>
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {currencyChoices.map((code) => (
                      <Button
                        key={code}
                        variant={fiatCurrency === code ? 'primary' : 'outline-secondary'}
                        className="px-3 py-2 rounded-3 border"
                        onClick={() => setFiatCurrency(code)}
                        disabled={isSubmitting}
                      >
                        <span className="fw-bold small">{code}</span>
                      </Button>
                    ))}
                  </div>
                </>
              )}

              <h6 className="fw-bold text-uppercase text-muted small mb-2">
                Select Payment Method
              </h6>
              <Row className="g-2 mb-3">
                <Col xs={12} sm={6}>
                  <Button
                    variant={paymentMethod === 'lightning' ? 'primary' : 'outline-secondary'}
                    className="w-100 py-3 rounded-3 d-flex flex-column align-items-center justify-content-center border"
                    onClick={() => setPaymentMethod('lightning')}
                    disabled={isSubmitting}
                  >
                    <span className="fs-5 mb-1">⚡ ₿</span>
                    <span className="fw-bold small">Bitcoin (Lightning)</span>
                  </Button>
                </Col>
                <Col xs={12} sm={6}>
                  <Button
                    variant={paymentMethod === 'monero' ? 'primary' : 'outline-secondary'}
                    className="w-100 py-3 rounded-3 d-flex flex-column align-items-center justify-content-center border"
                    onClick={() => setPaymentMethod('monero')}
                    disabled={isSubmitting}
                  >
                    <span className="fs-5 mb-1">ɱ</span>
                    <span className="fw-bold small">Monero (Private)</span>
                  </Button>
                </Col>
              </Row>

              <div className="text-center mb-4">
                <small className="text-muted">
                  {paymentMethod === 'lightning'
                    ? '⚡ Processed instantly via the Bitcoin Lightning Network.'
                    : '🔒 Private, untraceable settlement via Monero.'}
                </small>
              </div>

              <div className="bg-body-tertiary p-3 rounded border mb-4 d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
                <div>
                  <span className="text-body fw-bold d-block small">Total Due</span>
                  <span className="text-muted small">Estimated Settlement</span>
                </div>
                <div className="text-start text-sm-end">
                  <div className="text-primary fw-bold font-monospace fs-5">
                    {estimatedCryptoAmount}
                  </div>
                  <small className="text-muted">
                    {convertedFiatPrice !== null
                      ? formatCurrencyAmount(convertedFiatPrice, fiatCurrency)
                      : formatCurrencyAmount(plan.price_usd, 'usd')}
                  </small>
                </div>
              </div>

              <AsyncButton
                variant="success"
                className="w-100 py-2.5 fw-bold shadow-sm mb-2 text-white rounded-3"
                disabled={isUserLoading}
                loading={isSubmitting}
                loadingLabel="Generating Invoice..."
                onClick={handlePlaceOrder}
              >
                {`Generate ${paymentMethod === 'lightning' ? 'Bitcoin' : 'Monero'} Invoice`}
              </AsyncButton>

              <Button
                variant="link"
                className="w-100 text-muted text-decoration-none small text-center"
                onClick={() => navigate('/buy-plan')}
                disabled={isSubmitting}
              >
                Cancel and Go Back
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Checkout;
