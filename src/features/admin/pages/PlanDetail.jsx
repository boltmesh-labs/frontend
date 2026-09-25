import { useState } from 'react';
import { Button, Card, Col, Container, Form, InputGroup, Row, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useConfirm } from '@/hooks/useConfirm';
import { useForm } from '@/hooks/useForm';
import {
  usePlanDetail,
  useCreatePlan,
  useUpdatePlan,
  useDeletePlan,
} from '@/features/admin/hooks/usePlans';
import { formatDate } from '@/utils/dateFormatter';

import { DetailShell } from '@/components/DetailShell';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { DetailHeader } from '../components/DetailHeader';

const DEFAULT_FORM_DATA = {
  id: '',
  name: '',
  tier: 'standard',
  price_usd: 0.0,
  billing_cycle: 'monthly',
  duration_in_days: 30,
  max_devices: 5,
  speed_limit_mbps: 0,
  dedicated_ip: false,
  description: '',
  features: '',
  savings: '',
  popular: false,
  enabled: true,
  created_at: null,
  updated_at: null,
};

const formatPlanToForm = (plan) => {
  if (!plan) return DEFAULT_FORM_DATA;

  const formattedFeatures = Array.isArray(plan.features)
    ? plan.features.join('\n')
    : plan.features || '';

  return {
    id: plan.id || '',
    name: plan.name || '',
    tier: plan.tier || 'standard',
    price_usd: Number(plan.price_usd) || 0.0,
    billing_cycle: plan.billing_cycle || 'monthly',
    duration_in_days: parseInt(plan.duration_in_days, 10) || 30,
    max_devices: parseInt(plan.max_devices, 10) || 5,
    speed_limit_mbps: parseInt(plan.speed_limit_mbps, 10) || 0,
    dedicated_ip: Boolean(plan.dedicated_ip),
    description: plan.description || '',
    features: formattedFeatures,
    savings: plan.savings ?? '',
    popular: Boolean(plan.popular),
    enabled: plan.enabled ?? true,
    created_at: plan.created_at || null,
    updated_at: plan.updated_at || null,
  };
};

const PlanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm, confirmDialog } = useConfirm();

  const isNew = id === 'new';
  const pageTitle = isNew ? 'Create Plan' : `Edit Plan #${id}`;
  usePageTitle(pageTitle);

  const {
    data: targetPlan,
    isLoading,
    error: fetchError,
    refetch: refetchPlan,
  } = usePlanDetail(id);

  // Initial state derived cleanly on mount
  const [initialFormData] = useState(() => {
    return isNew || !targetPlan ? DEFAULT_FORM_DATA : formatPlanToForm(targetPlan);
  });
  const { values: formData, setValue, setValues } = useForm(initialFormData);

  // Re-sync the form whenever its data source changes identity. The source is
  // 'new' for the create form, the route id once that plan's data has loaded,
  // and null while a fetch is in flight. Keying on the id (not object identity)
  // fixes navigation between /admin/plans/:id routes — the same component
  // instance stays mounted, and previously the form kept showing the previous
  // plan's values because syncing only ran on the very first loading → loaded
  // transition. Background refetches keep the same source id, so they never
  // clobber in-progress edits.
  const formSource = isNew ? 'new' : targetPlan ? id : null;
  const [syncedSource, setSyncedSource] = useState(formSource);
  if (formSource !== null && formSource !== syncedSource) {
    setSyncedSource(formSource);
    setValues(formSource === 'new' ? DEFAULT_FORM_DATA : formatPlanToForm(targetPlan));
  }

  const createMutation = useCreatePlan();
  const updateMutation = useUpdatePlan();
  const deleteMutation = useDeletePlan();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const notFoundError =
    !isNew && !isLoading && fetchError === null && targetPlan === null
      ? `Subscription Plan #${id} was not found.`
      : null;

  const activeError = fetchError || notFoundError;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Checkboxes become booleans and number inputs stay numeric so
    // submit-time validation and payloads stay consistent.
    if (type === 'checkbox') {
      setValue(name, checked);
    } else if (type === 'number') {
      setValue(name, value === '' ? '' : Number(value));
    } else {
      setValue(name, value);
    }
  };

  const handleDelete = async () => {
    const isConfirmed = await confirm({
      title: 'Delete Subscription Plan',
      message: `Are you sure you want to delete "${formData.name}"? This action cannot be undone.`,
      confirmText: 'Delete Plan',
      confirmVariant: 'danger',
    });

    if (!isConfirmed) return;

    try {
      await deleteMutation.mutateAsync(id);
      navigate('/admin/plans');
    } catch {
      // Feedback is owned by useDeletePlan (toasts); the rejection is
      // contained here so the page does not double-toast.
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const parsedPrice = parseFloat(formData.price_usd);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error('Price must be a valid non-negative number.');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Plan name is required.');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Plan description is required.');
      return;
    }

    const featuresList = formData.features
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const basePayload = {
      name: formData.name.trim(),
      tier: formData.tier.trim() || 'standard',
      price_usd: parsedPrice,
      billing_cycle: formData.billing_cycle.trim() || 'monthly',
      duration_in_days: Math.max(1, parseInt(formData.duration_in_days, 10) || 30),
      max_devices: Math.max(1, parseInt(formData.max_devices, 10) || 1),
      speed_limit_mbps: Math.min(1000, Math.max(0, parseInt(formData.speed_limit_mbps, 10) || 0)),
      dedicated_ip: formData.dedicated_ip,
      description: formData.description.trim(),
      features: featuresList,
      savings: formData.savings || null,
      popular: formData.popular,
      enabled: formData.enabled,
    };

    try {
      if (isNew) {
        const cleanId = formData.id.trim();
        if (!cleanId) {
          toast.error('Plan identifier (ID) is required for new plans.');
          return;
        }
        if (!/^[a-z0-9-]+$/.test(cleanId)) {
          toast.error('Plan ID must contain only lowercase letters, numbers, and hyphens.');
          return;
        }
        await createMutation.mutateAsync({ id: cleanId, ...basePayload });
      } else {
        await updateMutation.mutateAsync({ id, ...basePayload });
      }
      navigate('/admin/plans');
    } catch {
      // Feedback is owned by useCreatePlan/useUpdatePlan (toasts); the
      // rejection is contained here so the page does not double-toast.
    }
  };

  return (
    <DetailShell
      loading={isLoading}
      error={activeError}
      data={isNew ? {} : targetPlan}
      refetch={refetchPlan}
      nullCheck={!isNew}
      backTo="/admin/plans"
      backLabel="Return to Plans"
      backVariant="outline-danger"
    >
      <Container className="py-5" style={{ maxWidth: '850px' }}>
        {confirmDialog}
        <DetailHeader
          title={isNew ? 'Create Subscription Plan' : formData.name || 'Subscription Plan'}
          id={isNew ? formData.id || 'NEW_PLAN' : id}
          idPrefix="Plan ID:"
        />

        <Card className="border-0 shadow-sm p-4 bg-body-tertiary rounded-3 position-relative">
          <LoadingOverlay
            show={isSubmitting || deleteMutation.isPending}
            message={
              isSubmitting
                ? 'Saving plan configuration...'
                : deleteMutation.isPending
                  ? 'Deleting plan...'
                  : ''
            }
          />

          <Form onSubmit={handleSubmit}>
            <Row className="g-3">
              {isNew && (
                <Col md={12}>
                  <Form.Group controlId="planId">
                    <Form.Label className="text-secondary fw-semibold small">
                      Plan Identifier (ID) <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="id"
                      value={formData.id}
                      onChange={handleInputChange}
                      placeholder="e.g. pro-annual, basic-monthly"
                      required
                    />
                    <Form.Text className="text-muted">
                      Unique slug/identifier for backend indexing. Cannot be changed after creation.
                    </Form.Text>
                  </Form.Group>
                </Col>
              )}

              <Col md={8}>
                <Form.Group controlId="planName">
                  <Form.Label className="text-secondary fw-semibold small">Plan Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Premium Annual"
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group controlId="planTier">
                  <Form.Label className="text-secondary fw-semibold small">
                    Tier Identifier
                  </Form.Label>
                  <Form.Select
                    name="tier"
                    value={formData.tier}
                    onChange={handleInputChange}
                    aria-label="Plan tier"
                  >
                    <option value="basic">basic</option>
                    <option value="standard">standard</option>
                    <option value="premium">premium</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group controlId="planPrice">
                  <Form.Label className="text-secondary fw-semibold small">Price (USD)</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="0"
                      name="price_usd"
                      value={formData.price_usd}
                      onChange={handleInputChange}
                      required
                    />
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group controlId="planBillingCycle">
                  <Form.Label className="text-secondary fw-semibold small">
                    Billing Cycle
                  </Form.Label>
                  <Form.Select
                    name="billing_cycle"
                    value={formData.billing_cycle}
                    onChange={handleInputChange}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group controlId="planSavings">
                  <Form.Label className="text-secondary fw-semibold small">Savings</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="100"
                    name="savings"
                    value={formData.savings}
                    onChange={handleInputChange}
                    placeholder="e.g. 20 for 20% savings"
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group controlId="planDuration">
                  <Form.Label className="text-secondary fw-semibold small">
                    Duration (Days)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    name="duration_in_days"
                    value={formData.duration_in_days}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group controlId="planDevices">
                  <Form.Label className="text-secondary fw-semibold small">Max Devices</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    name="max_devices"
                    value={formData.max_devices}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>

              {/* Speed Limit Field */}
              <Col md={4}>
                <Form.Group controlId="planSpeedLimit">
                  <Form.Label className="text-secondary fw-semibold small">
                    Speed Limit (Mbps)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="1000"
                    name="speed_limit_mbps"
                    value={formData.speed_limit_mbps}
                    onChange={handleInputChange}
                    placeholder="0 = Unlimited"
                  />
                  <Form.Text className="text-muted">Set 0 for unthrottled bandwidth.</Form.Text>
                </Form.Group>
              </Col>

              {/* Switches Column */}
              <Col md={8} className="d-flex align-items-center gap-3 pt-3">
                <Form.Check
                  type="switch"
                  id="enabled-switch"
                  name="enabled"
                  checked={formData.enabled}
                  onChange={handleInputChange}
                  label={<span className="fw-semibold small">Enabled</span>}
                />
                <Form.Check
                  type="switch"
                  id="popular-switch"
                  name="popular"
                  checked={formData.popular}
                  onChange={handleInputChange}
                  label={<span className="fw-semibold small">Popular</span>}
                />
                <Form.Check
                  type="switch"
                  id="dedicated-ip-switch"
                  name="dedicated_ip"
                  checked={formData.dedicated_ip}
                  onChange={handleInputChange}
                  label={<span className="fw-semibold small">Dedicated IP</span>}
                />
              </Col>

              <Col md={12}>
                <Form.Group controlId="planDescription">
                  <Form.Label className="text-secondary fw-semibold small">Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Brief summary of plan benefits..."
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group controlId="planFeatures">
                  <Form.Label className="text-secondary fw-semibold small">
                    Key Features (One feature per line)
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    name="features"
                    value={formData.features}
                    onChange={handleInputChange}
                    placeholder="Unlimited Bandwidth&#10;Multi-device Support&#10;24/7 Live Support"
                  />
                </Form.Group>
              </Col>

              {!isNew && (
                <Col md={12} className="pt-3 border-top mt-3">
                  <Row className="g-2 text-muted small font-monospace">
                    <Col sm={6}>
                      <span className="fw-semibold text-secondary">Created:</span>{' '}
                      {formatDate(formData.created_at)}
                    </Col>
                    <Col sm={6} className="text-sm-end">
                      <span className="fw-semibold text-secondary">Last Updated:</span>{' '}
                      {formatDate(formData.updated_at || formData.created_at)}
                    </Col>
                  </Row>
                </Col>
              )}

              <Col
                md={12}
                className="pt-3 border-top mt-4 d-flex align-items-center justify-content-between"
              >
                <div>
                  {!isNew && (
                    <Button
                      variant="outline-danger"
                      className="fw-bold rounded-3"
                      onClick={handleDelete}
                      disabled={isSubmitting || deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? 'Deleting...' : 'Delete Plan'}
                    </Button>
                  )}
                </div>
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-secondary"
                    className="fw-bold px-4 rounded-3"
                    onClick={() => navigate(-1)}
                    disabled={isSubmitting || deleteMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    className="fw-bold px-4 rounded-3"
                    disabled={isSubmitting || deleteMutation.isPending}
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner size="sm" animation="border" className="me-2" /> Saving...
                      </>
                    ) : isNew ? (
                      'Create Plan'
                    ) : (
                      'Save Settings'
                    )}
                  </Button>
                </div>
              </Col>
            </Row>
          </Form>
        </Card>
      </Container>
    </DetailShell>
  );
};

export default PlanDetail;
