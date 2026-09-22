import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Spinner, Form } from 'react-bootstrap';

import { usePageTitle } from '@/hooks/usePageTitle';
import { useConfirm } from '@/hooks/useConfirm';
import {
  useVpnRegionDetail,
  useCreateVpnRegion,
  useUpdateVpnRegion,
  useDeleteVpnRegion,
} from '@/features/admin/hooks/useVpnRegions';
import { DetailShell } from '@/components/DetailShell';
import { DetailHeader } from '../components/DetailHeader';
import { StatusBadge } from '@/components/StatusBadge';

import { formatDate } from '@/utils/dateFormatter';

const REGION_STATUS_VARIANTS = { active: 'success', inactive: 'secondary' };

const mapRegionToForm = (region) => ({
  id: region?.id || '',
  name: region?.name || '',
  country_code: region?.country_code || '',
  is_active: region?.is_active ?? true,
  created_at: region?.created_at || null,
  updated_at: region?.updated_at || null,
});

const VpnRegionForm = ({ initialData, isNew, refetchData }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm, confirmDialog } = useConfirm();

  const [isEditing, setIsEditing] = useState(isNew);
  const [formData, setFormData] = useState(() => mapRegionToForm(initialData));

  const createMutation = useCreateVpnRegion();
  const updateMutation = useUpdateVpnRegion();
  const deleteMutation = useDeleteVpnRegion();
  // Derived from the mutations instead of a parallel useState flag — React
  // Query already tracks pending state for both requests.
  const saving = createMutation.isPending || updateMutation.isPending;
  const deleting = deleteMutation.isPending;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();

    const payload = {
      name: formData.name.trim(),
      country_code: formData.country_code.trim().toUpperCase(),
      is_active: formData.is_active,
    };

    try {
      if (isNew) {
        // The region id is the immutable natural key — it is only sent on create.
        const response = await createMutation.mutateAsync({
          ...payload,
          id: formData.id.trim().toLowerCase(),
        });
        setFormData(mapRegionToForm(response));
        setIsEditing(false);
      } else {
        const response = await updateMutation.mutateAsync({ id, ...payload });
        setFormData(mapRegionToForm(response));
        setIsEditing(false);
        if (refetchData) refetchData();
      }
    } catch {
      // Feedback is owned by useCreateVpnRegion/useUpdateVpnRegion (toasts);
      // the rejection is contained here so the page does not double-toast.
    }
  };

  const handleCancel = useCallback(() => {
    if (isNew) {
      navigate(-1);
    } else {
      setIsEditing(false);
      setFormData(mapRegionToForm(initialData));
    }
  }, [isNew, navigate, initialData]);

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete VPN Region',
      message: `Are you sure you want to delete "${formData.name || id}"? This action cannot be undone.`,
      confirmText: 'Delete Region',
      confirmVariant: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(id);
      navigate('/admin/vpn-regions');
    } catch {
      // Feedback is owned by useDeleteVpnRegion (toasts); the rejection is
      // contained here so the page does not double-toast.
    }
  };

  const renderHeaderActions = () => {
    if (!isEditing) {
      return (
        <Button
          variant="outline-primary"
          className="shadow-sm"
          onClick={() => setIsEditing(true)}
          disabled={deleting}
        >
          🔧 Edit Region
        </Button>
      );
    }

    return (
      <>
        <Button
          variant="outline-secondary"
          className="shadow-sm me-2"
          onClick={handleCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="vpn-region-form"
          variant="outline-success"
          className="shadow-sm"
          disabled={saving || createMutation.isPending || updateMutation.isPending}
        >
          {(saving || createMutation.isPending || updateMutation.isPending) && (
            <Spinner size="sm" animation="border" className="me-2" />
          )}
          {saving || createMutation.isPending || updateMutation.isPending
            ? 'Saving...'
            : isNew
              ? 'Create Region'
              : 'Save Changes'}
        </Button>
      </>
    );
  };

  return (
    <Container className="py-5">
      {confirmDialog}
      <DetailHeader
        title={isNew ? 'Create VPN Region' : initialData?.name || 'VPN Region'}
        idPrefix="Region ID:"
        id={isNew ? 'NEW_REGION' : initialData?.id}
        badge={
          !isNew && (
            <StatusBadge
              status={initialData?.is_active ? 'active' : 'inactive'}
              variantMap={REGION_STATUS_VARIANTS}
            />
          )
        }
        actions={renderHeaderActions()}
      />

      <Form id="vpn-region-form" onSubmit={handleSaveChanges}>
        <Row className="g-4">
          <Col md={12}>
            <Card className="border-0 shadow-sm bg-body-tertiary p-4 h-100">
              <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                <h5 className="fw-bold text-body mb-0">Region Configuration</h5>
              </div>

              <Row className="g-3 small">
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-secondary fw-semibold">Region ID</Form.Label>
                    <Form.Control
                      type="text"
                      name="id"
                      className="font-monospace"
                      value={formData.id}
                      onChange={handleInputChange}
                      disabled={!isNew || !isEditing || saving}
                      placeholder="e.g. us-east-1"
                      required
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-secondary fw-semibold">Region Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="name"
                      className="font-monospace"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={!isEditing || saving}
                      placeholder="e.g. US East"
                      required
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-secondary fw-semibold">Country Code</Form.Label>
                    <Form.Control
                      type="text"
                      name="country_code"
                      className="font-monospace"
                      value={formData.country_code}
                      onChange={handleInputChange}
                      disabled={!isEditing || saving}
                      placeholder="e.g. US"
                      maxLength={2}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="g-3 small">
                <Col md={12}>
                  <Form.Check
                    type="switch"
                    id="region-active-switch"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    disabled={!isEditing || saving}
                    label={
                      <span className="fw-semibold text-body">
                        Region Active — new devices and peers can be provisioned in this region
                      </span>
                    }
                    className="pointer-switch"
                  />
                </Col>
              </Row>

              {!isNew && (
                <>
                  <div className="pt-3 border-top mt-4">
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
                  </div>
                  {!isEditing && (
                    <div className="pt-3 border-top mt-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
                      <div>
                        <Button
                          variant="outline-danger"
                          className="fw-bold rounded-3"
                          onClick={handleDelete}
                          disabled={saving || deleting}
                        >
                          {deleting ? 'Deleting...' : 'Delete Region'}
                        </Button>
                      </div>
                      <span className="text-muted small">
                        Regions with servers cannot be deleted.
                      </span>
                    </div>
                  )}
                </>
              )}
            </Card>
          </Col>
        </Row>
      </Form>
    </Container>
  );
};

const VpnRegionDetail = () => {
  const { id } = useParams();
  const isNew = id === 'new';

  const { data: region, isLoading, isError, error, refetch } = useVpnRegionDetail(id);

  usePageTitle(isNew ? 'Create VPN Region' : `Region ${id || ''} Details`);

  return (
    <DetailShell
      loading={isLoading}
      error={isError ? error : null}
      data={region}
      refetch={refetch}
      nullCheck={!isNew}
      backTo="/admin/vpn-regions"
      backLabel="← Back to Regions"
    >
      <VpnRegionForm
        key={region?.id || 'new'}
        initialData={region}
        isNew={isNew}
        refetchData={refetch}
      />
    </DetailShell>
  );
};

export default VpnRegionDetail;
