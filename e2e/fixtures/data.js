export const buildPlan = (overrides = {}) => ({
  id: 'plan-1',
  name: 'Starter Plan',
  description: 'Reliable VPN access for one device.',
  duration_in_days: 30,
  max_devices: 1,
  features: ['Fast VPN access', 'One connected device'],
  price_usd: 9.99,
  billing_cycle: 'monthly',
  enabled: true,
  ...overrides,
});

export const buildSubscription = ({ plan = buildPlan(), ...overrides } = {}) => ({
  id: 'subscription-1',
  status: 'active',
  expires_at: '2099-01-01T00:00:00Z',
  plan,
  ...overrides,
});

export const buildInvoice = ({ plan = buildPlan(), ...overrides } = {}) => ({
  id: 'invoice-1',
  plan_id: plan.id,
  plan,
  crypto_address: 'lnbc1testaddress',
  payment_uri: 'lightning:lnbc1testaddress',
  payment_method: 'lightning',
  currency: 'usd',
  amount_requested: 0.0002,
  expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  ...overrides,
});

export const buildUser = (overrides = {}) => ({
  id: 'user-1',
  username: 'test-user',
  email: 'test@example.com',
  is_verified: true,
  is_active: true,
  role: 'user',
  active_subscription: null,
  ...overrides,
});
