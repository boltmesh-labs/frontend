import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Spinner, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useConfirm } from '@/hooks/useConfirm';
import {
  useVpnServerDetail,
  useCreateVpnServer,
  useUpdateVpnServer,
  useDeleteVpnServer,
} from '@/features/admin/hooks/useVpnServers';
import { useVpnRegions } from '@/features/admin/hooks/useVpnRegions';
import { DetailShell } from '@/components/DetailShell';
import { CopyableField } from '@/components/CopyableField';
import { DetailHeader } from '../components/DetailHeader';

import { formatDate } from '@/utils/dateFormatter';
import { VPN_SERVER_STATUSES } from '@/constants/statuses';

const DEFAULT_STATUS = 'provisioning';
const DEFAULT_OS = 'rocky';

const mapServerToForm = (server) => ({
  name: server?.name || '',
  region_id: server?.region_id || '',
  public_ip: server?.public_ip || '',
  endpoint: server?.endpoint || '',
  tunnel_ip: server?.tunnel_ip || '',
  wg_port: server?.wg_port ?? '',
  // Read-only display: client DNS is always the tunnel host address
  // (derived server-side), never an editable field.
  wg_public_key: server?.wg_public_key || '',
  os: server?.os || DEFAULT_OS,
  status: server?.status || DEFAULT_STATUS,
  created_at: server?.created_at || null,
  updated_at: server?.updated_at || null,
});

const VpnServerForm = ({ initialData, isNew, refetchData }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm, confirmDialog } = useConfirm();

  const [isEditing, setIsEditing] = useState(isNew);
  const [formData, setFormData] = useState(() => mapServerToForm(initialData));
  const [bootstrapCommand, setBootstrapCommand] = useState('');

  const {
    data: regionsData,
    isLoading: regionsLoading,
    isError: regionsError,
  } = useVpnRegions({ limit: 100 });

  const createMutation = useCreateVpnServer();
  const updateMutation = useUpdateVpnServer();
  const deleteMutation = useDeleteVpnServer();
  // Derived from the mutations instead of a parallel useState flag — React
  // Query already tracks pending state for both requests.
  const saving = createMutation.isPending || updateMutation.isPending;
  const deleting = deleteMutation.isPending;

  // Origin-gated topology editing (mirrors the backend PATCH rule in
  // app/admin/services/server.py): manual admin-created servers
  // (is_manual) keep identity/topology fields editable in any status —
  // manual registration is lookup-only. AMI auto-provisioned servers are
  // node-authoritative (topology upserted on every boot), so those fields
  // stay locked and only `status` remains editable. Unknown origin fails
  // closed to the locked state.
  const isManualServer = isNew || initialData?.is_manual === true;
  const isTopologyLocked = !isNew && !isManualServer;
  // Hard delete is a terminal action: the backend only deletes
  // `decommissioned` servers and blocks while peers still reference the row.
  const isDeletable = !isNew && formData.status === VPN_SERVER_STATUSES.decommissioned;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();

    const regionId = typeof formData.region_id === 'string' ? formData.region_id.trim() : '';
    const publicIp = typeof formData.public_ip === 'string' ? formData.public_ip.trim() : '';

    if (!isTopologyLocked) {
      // HTML5 `required` cannot help while the region select is disabled during
      // load (disabled controls are exempt from constraint validation), and an
      // empty region_id would only earn a cryptic backend UUID-validation error.
      if (!regionId) {
        toast.error('Region is required.');
        return;
      }

      // public_ip is required on server create (backend 422s otherwise); on
      // manual edits the form is prefilled from the stored server so
      // the trimmed value applies.
      if (!publicIp) {
        toast.error('Public IP is required.');
        return;
      }
    }

    const parsedPort = parseInt(formData.wg_port, 10);

    const payload = {
      status: formData.status || DEFAULT_STATUS,
    };

    if (!isTopologyLocked) {
      payload.name = formData.name.trim();
      payload.region_id = regionId;
      payload.public_ip = publicIp;
      // Endpoint is optional (backend defaults to None = dial public_ip).
      // Never send "" — backend validate_endpoint 422s on empty strings.
      // Create omits it when empty; edit sends null to clear the stored value.
      const endpoint = typeof formData.endpoint === 'string' ? formData.endpoint.trim() : '';
      if (endpoint) payload.endpoint = endpoint;
      else if (!isNew) payload.endpoint = null;
      payload.os = formData.os || DEFAULT_OS;
    }

    // tunnel_ip/wg_port travel with the rest of the topology fields:
    // sent on create and on manual edits, never on AMI-locked edits
    // (an omitted wg_port falls back to the Settings default server-side).
    if (!isTopologyLocked) {
      if (isNew) payload.tunnel_ip = formData.tunnel_ip.trim();
      else if (formData.tunnel_ip.trim()) payload.tunnel_ip = formData.tunnel_ip.trim();
      if (!Number.isNaN(parsedPort)) payload.wg_port = parsedPort;
    }

    try {
      if (isNew) {
        const response = await createMutation.mutateAsync(payload);
        setBootstrapCommand(response.bootstrap_command);
        setIsEditing(false);
      } else {
        const response = await updateMutation.mutateAsync({ id, ...payload });
        setFormData(mapServerToForm(response));
        setIsEditing(false);
        if (refetchData) refetchData();
      }
    } catch {
      // Feedback is owned by useCreateVpnServer/useUpdateVpnServer (toasts);
      // the rejection is contained here so the page does not double-toast.
    }
  };

  const handleCancel = useCallback(() => {
    if (isNew) {
      navigate(-1);
    } else {
      setIsEditing(false);
      setFormData(mapServerToForm(initialData));
    }
  }, [isNew, navigate, initialData]);

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete VPN Server',
      message: `Are you sure you want to delete "${formData.name || id}"? This action cannot be undone.`,
      confirmText: 'Delete Server',
      confirmVariant: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(id);
      navigate('/admin/vpn-servers');
    } catch {
      // Feedback is owned by useDeleteVpnServer (toasts); the rejection is
      // contained here so the page does not double-toast.
    }
  };

  const renderHeaderActions = () => {
    if (bootstrapCommand) {
      return (
        <Button
          variant="primary"
          className="shadow-sm"
          onClick={() => navigate('/admin/vpn-servers')}
        >
          Back to Servers
        </Button>
      );
    }

    if (!isEditing) {
      return (
        <Button
          variant="outline-primary"
          className="shadow-sm"
          onClick={() => setIsEditing(true)}
          disabled={deleting}
        >
          🔧 Edit Server
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
          form="vpn-server-form"
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
              ? 'Create Server'
              : 'Save Changes'}
        </Button>
      </>
    );
  };

  return (
    <Container className="py-5">
      {confirmDialog}
      <DetailHeader
        title={isNew ? 'Create VPN Server' : initialData?.name || 'VPN Server Node'}
        id={isNew ? 'NEW_SERVER' : initialData?.id}
        actions={renderHeaderActions()}
      />

      <Form id="vpn-server-form" onSubmit={handleSaveChanges}>
        <Row className="g-4">
          <Col md={12}>
            <Card className="border-0 shadow-sm bg-body-tertiary p-4 h-100">
              <h6 className="fw-bold text-body border-bottom pb-3 mb-3">Server Configuration</h6>
              {!isNew && (
                <div className="mb-3">
                  {isManualServer ? (
                    <span className="badge text-bg-info">
                      Manual topology. Server/service restart required to apply changes.
                    </span>
                  ) : (
                    <div className="alert alert-warning py-2 mb-0 small" role="note">
                      Auto-provisioned (AMI): Managed by node. Only status is editable.
                    </div>
                  )}
                </div>
              )}

              <Row className="g-3 small">
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-secondary fw-semibold">Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="name"
                      className="font-monospace"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={!isEditing || saving || isTopologyLocked}
                      placeholder="e.g. Us-East-01"
                      required={!isTopologyLocked}
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-secondary fw-semibold">Region</Form.Label>
                    <Form.Select
                      name="region_id"
                      className="font-monospace"
                      value={formData.region_id}
                      onChange={handleInputChange}
                      disabled={!isEditing || saving || regionsLoading || isTopologyLocked}
                      required={!isTopologyLocked}
                    >
                      <option value="">
                        {regionsLoading
                          ? 'Loading regions...'
                          : regionsError
                            ? 'Unable to load regions'
                            : 'Select a region...'}
                      </option>
                      {Array.isArray(regionsData?.data) &&
                        regionsData.data.map((region) => (
                          <option key={region.id} value={region.id}>
                            {region.id} — {region.name}
                          </option>
                        ))}
                    </Form.Select>
                    {regionsError && (
                      <Form.Text className="text-warning">
                        Regions could not be loaded; the server will be saved without a region.
                      </Form.Text>
                    )}
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-secondary fw-semibold">Server Status</Form.Label>
                    {isNew ? (
                      <Form.Select
                        name="status"
                        className="font-monospace"
                        value={formData.status}
                        onChange={handleInputChange}
                        disabled={saving}
                      >
                        <option value={VPN_SERVER_STATUSES.provisioning}>Provisioning</option>
                      </Form.Select>
                    ) : (
                      <>
                        <Form.Select
                          name="status"
                          className="font-monospace"
                          value={formData.status}
                          onChange={handleInputChange}
                          disabled={!isEditing || saving}
                        >
                          <option value={VPN_SERVER_STATUSES.online}>Online</option>
                          <option value={VPN_SERVER_STATUSES.maintenance}>Maintenance</option>
                          <option value={VPN_SERVER_STATUSES.decommissioned}>Decommissioned</option>
                          {![
                            VPN_SERVER_STATUSES.online,
                            VPN_SERVER_STATUSES.maintenance,
                            VPN_SERVER_STATUSES.decommissioned,
                          ].includes(formData.status) && (
                            <option value={formData.status} disabled>
                              {formData.status}
                            </option>
                          )}
                        </Form.Select>
                      </>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              <Row className="g-3 small">
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-secondary fw-semibold">Operating System</Form.Label>
                    <Form.Select
                      name="os"
                      className="font-monospace"
                      value={formData.os}
                      onChange={handleInputChange}
                      disabled={!isEditing || saving || isTopologyLocked}
                    >
                      <option value="rocky">Rocky Linux</option>
                      <option value="ubuntu">Ubuntu</option>
                      <option value="debian">Debian</option>
                      <option value="alpine">Alpine Linux</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <h6 className="fw-bold text-body border-bottom pb-3 mb-3 mt-4">WireGuard</h6>

              <Row className="g-3 small">
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-secondary fw-semibold">
                      Public IP Address
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="public_ip"
                      className="font-monospace"
                      value={formData.public_ip}
                      onChange={handleInputChange}
                      disabled={!isEditing || saving || isTopologyLocked}
                      placeholder="e.g. 198.51.100.1"
                      required={!isTopologyLocked}
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-secondary fw-semibold">
                      Endpoint (optional)
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="endpoint"
                      className="font-monospace"
                      value={formData.endpoint}
                      onChange={handleInputChange}
                      disabled={!isEditing || saving || isTopologyLocked}
                      placeholder="e.g. node-1.us-east-1.vpn.example.com (defaults to public IP)"
                    />
                    <Form.Text className="text-muted">
                      Leave empty to have clients dial the public IP.
                    </Form.Text>
                  </Form.Group>
                </Col>

                <Col md={2}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-secondary fw-semibold">Port (UDP)</Form.Label>
                    <Form.Control
                      type="number"
                      name="wg_port"
                      min={1}
                      max={65535}
                      className="font-monospace"
                      value={formData.wg_port}
                      onChange={handleInputChange}
                      disabled={!isEditing || saving || isTopologyLocked}
                      placeholder="51820"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="g-3 small">
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-secondary fw-semibold">Tunnel Address</Form.Label>
                    <Form.Control
                      type="text"
                      name="tunnel_ip"
                      className="font-monospace"
                      value={formData.tunnel_ip}
                      onChange={handleInputChange}
                      disabled={!isEditing || saving || isTopologyLocked}
                      placeholder="e.g. 10.1.0.1/16"
                      required={isNew}
                    />
                    {!isNew && (
                      <Form.Text className="text-muted">IP address with prefix.</Form.Text>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              {!isNew && formData.wg_public_key && (
                <Row className="g-3 small">
                  <Col md={12}>
                    <CopyableField
                      label="WireGuard Public Key"
                      value={formData.wg_public_key}
                      toastLabel="Public key"
                    />
                  </Col>
                </Row>
              )}

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
                  <div className="pt-3 border-top mt-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <div>
                      {isDeletable && !isEditing && (
                        <Button
                          variant="outline-danger"
                          className="fw-bold rounded-3"
                          onClick={handleDelete}
                          disabled={saving || deleting}
                        >
                          {deleting ? 'Deleting...' : 'Delete Server'}
                        </Button>
                      )}
                    </div>
                    {!isDeletable && !isEditing && (
                      <span className="text-muted small">
                        Only decommissioned servers can be deleted.
                      </span>
                    )}
                  </div>
                </>
              )}
            </Card>
          </Col>
        </Row>
      </Form>

      {bootstrapCommand && (
        <Card className="border-0 shadow-sm mt-4 p-4">
          <h5 className="fw-bold text-body mb-2">Bootstrap Command</h5>
          <p className="text-secondary mb-3">
            Run this command on the new VPN server to install and connect the node agent.
          </p>
          <CopyableField
            label="Node Bootstrap Command"
            value={bootstrapCommand}
            toastLabel="Bootstrap command"
          />
          <p className="text-warning small mb-0 mt-3">
            Keep this command private: it embeds the node bootstrap secret and will not be shown
            again.
          </p>
        </Card>
      )}
    </Container>
  );
};

const VpnServerDetail = () => {
  const { id } = useParams();
  const isNew = id === 'new';

  const { data: server, isLoading, isError, error, refetch } = useVpnServerDetail(id);

  usePageTitle(isNew ? 'Create VPN Server' : `Server ${id || ''} Details`);

  return (
    <DetailShell
      loading={isLoading}
      error={isError ? error : null}
      data={server}
      refetch={refetch}
      nullCheck={!isNew}
      backTo="/admin/vpn-servers"
      backLabel="← Back to Servers"
    >
      <VpnServerForm
        key={server?.id || 'new'}
        initialData={server}
        isNew={isNew}
        refetchData={refetch}
      />
    </DetailShell>
  );
};

export default VpnServerDetail;
