import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Spinner,
  Form,
  Collapse,
} from "react-bootstrap";
import { toast } from "react-toastify";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useConfirm } from "@/hooks/useConfirm";
import {
  useVpnServerDetail,
  useCreateVpnServer,
  useUpdateVpnServer,
  useDeleteVpnServer,
} from "@/features/admin/hooks/useVpnServers";
import { useVpnRegions } from "@/features/admin/hooks/useVpnRegions";
import { DetailShell } from "@/components/DetailShell";
import { CopyableField } from "@/components/CopyableField";
import { DetailHeader } from "../components/DetailHeader";

import { formatDate } from "@/utils/dateFormatter";
import { VPN_SERVER_STATUSES } from "@/constants/statuses";

const DEFAULT_STATUS = "provisioning";
const DEFAULT_OS = "rocky";

// The flat AWG parameter field names, in render order. Kept as data so the
// section is one map instead of eleven near-identical JSX blocks.
const AWG_PARAM_FIELDS = [
  { label: "Junk Count (Jc)", name: "jc", max: 128 },
  { label: "Junk Min (Jmin)", name: "jmin", max: 1500 },
  { label: "Junk Max (Jmax)", name: "jmax", max: 1500 },
  { label: "Init Padding S1", name: "s1", max: 1500 },
  { label: "Init Padding S2", name: "s2", max: 1500 },
  { label: "Init Padding S3", name: "s3", max: 1500 },
  { label: "Init Padding S4", name: "s4", max: 1500 },
];

const AWG_HEADER_FIELDS = [1, 2, 3, 4].flatMap((index) => [
  { label: `Magic Header H${index} low`, name: `h${index}_lo` },
  { label: `Magic Header H${index} high`, name: `h${index}_hi` },
]);

const AWG_FORM_FIELDS = [...AWG_PARAM_FIELDS, ...AWG_HEADER_FIELDS];

const toOptionalNumber = (value) =>
  value === "" || value === null || value === undefined ? null : Number(value);

// The server stores the parameter set flat (the mode is `awg_enabled`), and the
// form edits it flat too, so the two halves of the mapping live together. Blank
// numeric inputs are "not set" rather than 0.
const mapAwgParamsToForm = (params) => {
  const p = params || {};
  return {
    jc: p.jc ?? "",
    jmin: p.jmin ?? "",
    jmax: p.jmax ?? "",
    s1: p.s1 ?? "",
    s2: p.s2 ?? "",
    s3: p.s3 ?? "",
    s4: p.s4 ?? "",
    h1_lo: p.h1?.[0] ?? "",
    h1_hi: p.h1?.[1] ?? "",
    h2_lo: p.h2?.[0] ?? "",
    h2_hi: p.h2?.[1] ?? "",
    h3_lo: p.h3?.[0] ?? "",
    h3_hi: p.h3?.[1] ?? "",
    h4_lo: p.h4?.[0] ?? "",
    h4_hi: p.h4?.[1] ?? "",
  };
};

// Null when the rung is off (the backend forbids params on a disabled rung);
// undefined when every field is blank, which lets the backend generate one per
// server on create and leaves the stored set untouched on edit.
const buildAwgParams = (formData) => {
  if (!formData.awg_enabled) return null;
  if (
    AWG_FORM_FIELDS.every(
      (f) => formData[f.name] === "" || formData[f.name] == null,
    )
  ) {
    return undefined;
  }
  return {
    jc: toOptionalNumber(formData.jc),
    jmin: toOptionalNumber(formData.jmin),
    jmax: toOptionalNumber(formData.jmax),
    s1: toOptionalNumber(formData.s1),
    s2: toOptionalNumber(formData.s2),
    s3: toOptionalNumber(formData.s3),
    s4: toOptionalNumber(formData.s4),
    h1: [toOptionalNumber(formData.h1_lo), toOptionalNumber(formData.h1_hi)],
    h2: [toOptionalNumber(formData.h2_lo), toOptionalNumber(formData.h2_hi)],
    h3: [toOptionalNumber(formData.h3_lo), toOptionalNumber(formData.h3_hi)],
    h4: [toOptionalNumber(formData.h4_lo), toOptionalNumber(formData.h4_hi)],
  };
};

const randomInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

// A well-formed starting point, not a policy: which parameters actually evade a
// given censor is an operator decision, so this only guarantees the shape the
// AmneziaWG device requires — in-range junk and padding, and four
// pairwise-disjoint magic-header ranges drawn well above the standard WireGuard
// message types. Each range sits in its own slot, so it can never overlap a
// neighbour.
const generateAwgParams = () => {
  const headerBase = 0x40000000;
  const headerStep = 0x10000000;
  const headerSpread = 0x00ffffff;
  const headers = {};
  for (let i = 1; i <= 4; i += 1) {
    const lo = headerBase + i * headerStep;
    headers[`h${i}_lo`] = lo;
    headers[`h${i}_hi`] = lo + randomInt(0, headerSpread);
  }
  return {
    jc: randomInt(3, 10),
    jmin: randomInt(10, 50),
    jmax: randomInt(600, 1000),
    s1: randomInt(10, 100),
    s2: randomInt(10, 100),
    s3: randomInt(10, 100),
    s4: randomInt(10, 100),
    ...headers,
  };
};

const AwgNumberField = ({ label, name, value, onChange, disabled, max }) => (
  <Col md={3}>
    <Form.Group className="mb-3" controlId={`awg-${name}`}>
      <Form.Label className="text-secondary fw-semibold">{label}</Form.Label>
      <Form.Control
        type="number"
        name={name}
        className="font-monospace"
        value={value}
        onChange={onChange}
        disabled={disabled}
        min={0}
        max={max}
      />
    </Form.Group>
  </Col>
);

const mapServerToForm = (server, isNew = false) => ({
  name: server?.name || "",
  region_id: server?.region_id || "",
  public_ip: server?.public_ip || "",
  endpoint: server?.endpoint || "",
  tunnel_ip: server?.tunnel_ip || "",
  wg_port: server?.wg_port ?? "",
  awg_enabled: server?.awg_enabled ?? true,
  awg_port: server?.awg_port ?? "",
  awg_tunnel_ip: server?.awg_tunnel_ip ?? "",
  ...mapAwgParamsToForm(server?.awg_params),
  tcp_enabled: server?.tcp_enabled ?? true,
  tcp_port: server?.tcp_port ?? (isNew ? 443 : ""),
  // Read-only display: client DNS is always the tunnel host address
  // (derived server-side), never an editable field.
  wg_public_key: server?.wg_public_key || "",
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
  const [formData, setFormData] = useState(() =>
    mapServerToForm(initialData, isNew),
  );
  const [bootstrapCommand, setBootstrapCommand] = useState("");
  // Open by default when the server already runs the obfuscated rung, so the live
  // parameters are visible without a click.
  const [showAwgParams, setShowAwgParams] = useState(
    () => initialData?.awg_enabled === true,
  );

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

  // Two gates mirror the backend PATCH rule (VpnServerService.update_server):
  //
  // - Origin: on an AMI auto-provisioned row (is_manual false) the fields
  //   Terraform owns — name, region, public IP, endpoint and the three ports —
  //   are never editable; the backend cannot make them true and the next boot
  //   would revert them. Unknown origin fails closed to the locked state.
  // - Status: every config field is editable only while the server is
  //   provisioning or maintenance, because a running server reads its
  //   configuration once at registration. `status` is always editable.
  //
  // `os` and `tunnel_ip` are the exception on an AMI row: the server adopts them
  // from the registration response, so the backend owns them and the status
  // window alone governs them.
  const isManualServer = isNew || initialData?.is_manual === true;
  const isAmiServer = !isNew && !isManualServer;
  const configWindowOpen =
    isNew ||
    [
      VPN_SERVER_STATUSES.provisioning,
      VPN_SERVER_STATUSES.maintenance,
    ].includes(formData.status);
  // Terraform-owned on an AMI row, and every field outside the status window.
  const infraLocked = isAmiServer || !configWindowOpen;
  // Backend-owned fields (os, tunnel_ip): the status window alone governs them.
  const configLocked = !configWindowOpen;
  // Hard delete is a terminal action: the backend only deletes
  // `decommissioned` servers and blocks while peers still reference the row.
  const isDeletable =
    !isNew && formData.status === VPN_SERVER_STATUSES.decommissioned;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleGenerateAwgParams = () => {
    setFormData((prev) => ({ ...prev, ...generateAwgParams() }));
    setShowAwgParams(true);
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();

    const regionId =
      typeof formData.region_id === "string" ? formData.region_id.trim() : "";
    const publicIp =
      typeof formData.public_ip === "string" ? formData.public_ip.trim() : "";

    if (!infraLocked) {
      // HTML5 `required` cannot help while the region select is disabled during
      // load (disabled controls are exempt from constraint validation), and an
      // empty region_id would only earn a cryptic backend UUID-validation error.
      if (!regionId) {
        toast.error("Region is required.");
        return;
      }

      // public_ip is required on server create (backend 422s otherwise); on
      // manual edits the form is prefilled from the stored server so
      // the trimmed value applies.
      if (!publicIp) {
        toast.error("Public IP is required.");
        return;
      }
    }

    const parsedWgPort = parseInt(formData.wg_port, 10);
    const parsedAwgPort = parseInt(formData.awg_port, 10);
    const parsedTcpPort = parseInt(formData.tcp_port, 10);

    const payload = {
      status: formData.status || DEFAULT_STATUS,
    };

    // Terraform-owned fields: sent on create and on manual edits inside the
    // status window, never on an AMI-locked edit (the backend refuses them there
    // and the next boot would revert them anyway).
    if (!infraLocked) {
      payload.name = formData.name.trim();
      payload.region_id = regionId;
      payload.public_ip = publicIp;
      // Endpoint is optional (backend defaults to None = dial public_ip).
      // Never send "" — backend validate_endpoint 422s on empty strings.
      // Create omits it when empty; edit sends null to clear the stored value.
      const endpoint =
        typeof formData.endpoint === "string" ? formData.endpoint.trim() : "";
      if (endpoint) payload.endpoint = endpoint;
      else if (!isNew) payload.endpoint = null;
      // The three ports are Terraform-owned on an AMI row; on manual rows a blank
      // one is omitted, so the backend fills it from Settings on create or keeps
      // the stored value on edit.
      if (!Number.isNaN(parsedWgPort)) payload.wg_port = parsedWgPort;
      if (!Number.isNaN(parsedAwgPort)) payload.awg_port = parsedAwgPort;
      if (!Number.isNaN(parsedTcpPort)) payload.tcp_port = parsedTcpPort;
    }

    // Backend-owned fields: the server adopts them from the registration response,
    // so they are editable on an AMI row too — the status window is the only
    // gate. Sent whenever it is open.
    if (!configLocked) {
      payload.os = formData.os || DEFAULT_OS;
      if (isNew) payload.tunnel_ip = formData.tunnel_ip.trim();
      else if (formData.tunnel_ip.trim())
        payload.tunnel_ip = formData.tunnel_ip.trim();

      // The rung switches, plus the AWG parameters and overlay. A disabled rung
      // carries nothing, which is the rule the backend enforces: null the params
      // and the overlay with the switch.
      payload.awg_enabled = formData.awg_enabled;
      const awgParams = buildAwgParams(formData);
      if (awgParams !== undefined) payload.awg_params = awgParams;
      payload.awg_tunnel_ip = formData.awg_enabled
        ? formData.awg_tunnel_ip.trim() || null
        : null;
      payload.tcp_enabled = formData.tcp_enabled;
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
      title: "Delete VPN Server",
      message: `Are you sure you want to delete "${formData.name || id}"? This action cannot be undone.`,
      confirmText: "Delete Server",
      confirmVariant: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(id);
      navigate("/admin/vpn-servers");
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
          onClick={() => navigate("/admin/vpn-servers")}
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
          disabled={
            saving || createMutation.isPending || updateMutation.isPending
          }
        >
          {(saving || createMutation.isPending || updateMutation.isPending) && (
            <Spinner size="sm" animation="border" className="me-2" />
          )}
          {saving || createMutation.isPending || updateMutation.isPending
            ? "Saving..."
            : isNew
              ? "Create Server"
              : "Save Changes"}
        </Button>
      </>
    );
  };

  return (
    <Container className="py-5">
      {confirmDialog}
      <DetailHeader
        title={isNew ? "Create VPN Server" : initialData?.name || "VPN Server"}
        id={isNew ? "NEW_SERVER" : initialData?.id}
        actions={renderHeaderActions()}
      />

      <Form id="vpn-server-form" onSubmit={handleSaveChanges}>
        <Row className="g-4">
          <Col md={12}>
            <Card className="border-0 shadow-sm bg-body-tertiary p-4 h-100">
              <h6 className="fw-bold text-body border-bottom pb-3 mb-3">
                Server Configuration
              </h6>
              {!isNew && (
                <div className="mb-3">
                  {isManualServer ? (
                    <span className="badge text-bg-info">
                      Manual topology. Server/service restart required to apply
                      changes.
                    </span>
                  ) : (
                    <div
                      className="alert alert-warning py-2 mb-0 small"
                      role="note"
                    >
                      Auto-provisioned (AMI): Terraform owns the name, region,
                      addresses and ports. The OS and tunnel address are
                      editable while the server is provisioning or maintenance.
                    </div>
                  )}
                </div>
              )}

              <Row className="g-3 small">
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-secondary fw-semibold">
                      Name
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="name"
                      className="font-monospace"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={!isEditing || saving || infraLocked}
                      placeholder="e.g. Us-East-01"
                      required={!infraLocked}
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-secondary fw-semibold">
                      Region
                    </Form.Label>
                    <Form.Select
                      name="region_id"
                      className="font-monospace"
                      value={formData.region_id}
                      onChange={handleInputChange}
                      disabled={
                        !isEditing || saving || regionsLoading || infraLocked
                      }
                      required={!infraLocked}
                    >
                      <option value="">
                        {regionsLoading
                          ? "Loading regions..."
                          : regionsError
                            ? "Unable to load regions"
                            : "Select a region..."}
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
                        Regions could not be loaded; the server will be saved
                        without a region.
                      </Form.Text>
                    )}
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-secondary fw-semibold">
                      Server Status
                    </Form.Label>
                    {isNew ? (
                      <Form.Select
                        name="status"
                        className="font-monospace"
                        value={formData.status}
                        onChange={handleInputChange}
                        disabled={saving}
                      >
                        <option value={VPN_SERVER_STATUSES.provisioning}>
                          Provisioning
                        </option>
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
                          <option value={VPN_SERVER_STATUSES.online}>
                            Online
                          </option>
                          <option value={VPN_SERVER_STATUSES.maintenance}>
                            Maintenance
                          </option>
                          <option value={VPN_SERVER_STATUSES.decommissioned}>
                            Decommissioned
                          </option>
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
                    <Form.Label className="text-secondary fw-semibold">
                      Operating System
                    </Form.Label>
                    <Form.Select
                      name="os"
                      className="font-monospace"
                      value={formData.os}
                      onChange={handleInputChange}
                      disabled={!isEditing || saving || configLocked}
                    >
                      <option value="rocky">Rocky Linux</option>
                      <option value="ubuntu">Ubuntu</option>
                      <option value="debian">Debian</option>
                      <option value="alpine">Alpine Linux</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <h6 className="fw-bold text-body border-bottom pb-3 mb-3 mt-4">
                WireGuard
              </h6>

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
                      disabled={!isEditing || saving || infraLocked}
                      placeholder="e.g. 198.51.100.1"
                      required={!infraLocked}
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
                      disabled={!isEditing || saving || infraLocked}
                      placeholder="e.g. server-1.us-east-1.vpn.example.com (defaults to public IP)"
                    />
                    <Form.Text className="text-muted">
                      Leave empty to have clients dial the public IP.
                    </Form.Text>
                  </Form.Group>
                </Col>

                <Col md={2}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-secondary fw-semibold">
                      Port (UDP)
                    </Form.Label>
                    <Form.Control
                      type="number"
                      name="wg_port"
                      min={1}
                      max={65535}
                      className="font-monospace"
                      value={formData.wg_port}
                      onChange={handleInputChange}
                      disabled={!isEditing || saving || infraLocked}
                      placeholder="51820"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="g-3 small">
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-secondary fw-semibold">
                      Tunnel Address
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="tunnel_ip"
                      className="font-monospace"
                      value={formData.tunnel_ip}
                      onChange={handleInputChange}
                      disabled={!isEditing || saving || configLocked}
                      placeholder="e.g. 10.1.0.1/16"
                      required={isNew}
                    />
                    {!isNew && (
                      <Form.Text className="text-muted">
                        IP address with prefix.
                      </Form.Text>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              {!isNew && formData.wg_public_key && (
                <Row className="g-3 small">
                  <Col md={12}>
                    <CopyableField
                      label="Public Key"
                      value={formData.wg_public_key}
                      toastLabel="Public key"
                    />
                  </Col>
                </Row>
              )}

              <h6 className="fw-bold text-body border-bottom pb-3 mb-3 mt-4">
                AmneziaWG (Obfuscated)
              </h6>

              <Row className="g-3 small">
                <Col md={12}>
                  <Form.Check
                    type="switch"
                    id="awg-enabled-switch"
                    name="awg_enabled"
                    checked={formData.awg_enabled}
                    onChange={handleInputChange}
                    disabled={!isEditing || saving || configLocked}
                    label={
                      <span className="fw-semibold text-body">
                        Serve the obfuscated rung
                      </span>
                    }
                    className="pointer-switch"
                  />
                </Col>
              </Row>

              {formData.awg_enabled && (
                <>
                  <Row className="g-3 small mt-1">
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label className="text-secondary fw-semibold">
                          Port (UDP)
                        </Form.Label>
                        <Form.Control
                          type="number"
                          name="awg_port"
                          min={1}
                          max={65535}
                          className="font-monospace"
                          value={formData.awg_port}
                          onChange={handleInputChange}
                          disabled={!isEditing || saving || infraLocked}
                          placeholder="51821"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label className="text-secondary fw-semibold">
                          Tunnel Address
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="awg_tunnel_ip"
                          className="font-monospace"
                          value={formData.awg_tunnel_ip}
                          onChange={handleInputChange}
                          disabled={!isEditing || saving || configLocked}
                          placeholder="e.g. 10.2.0.1/16"
                          required
                        />
                        <Form.Text className="text-muted">
                          A network of its own — the second device cannot share
                          the stock overlay.
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={4} className="d-flex align-items-start pt-1">
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="text-decoration-none"
                        onClick={() => setShowAwgParams((open) => !open)}
                      >
                        {showAwgParams ? "Hide parameters" : "Show parameters"}
                      </Button>
                    </Col>
                  </Row>

                  <Collapse in={showAwgParams}>
                    <div>
                      <Row className="g-3 small">
                        {AWG_PARAM_FIELDS.map((field) => (
                          <AwgNumberField
                            key={field.name}
                            {...field}
                            value={formData[field.name]}
                            onChange={handleInputChange}
                            disabled={!isEditing || saving || configLocked}
                          />
                        ))}
                      </Row>
                      <Row className="g-3 small">
                        {AWG_HEADER_FIELDS.map((field) => (
                          <AwgNumberField
                            key={field.name}
                            {...field}
                            value={formData[field.name]}
                            onChange={handleInputChange}
                            disabled={!isEditing || saving || configLocked}
                          />
                        ))}
                      </Row>
                      <div className="d-flex justify-content-between align-items-start gap-3">
                        <Form.Text className="text-muted">
                          Each magic header is a [low, high] range; the four
                          ranges must not overlap. Padding and junk sizes are in
                          bytes. Leave them blank on create to have one
                          generated per server.
                        </Form.Text>
                        <Button
                          type="button"
                          variant="outline-secondary"
                          size="sm"
                          className="flex-shrink-0"
                          onClick={handleGenerateAwgParams}
                          disabled={!isEditing || saving || configLocked}
                        >
                          Generate
                        </Button>
                      </div>
                    </div>
                  </Collapse>
                </>
              )}

              <h6 className="fw-bold text-body border-bottom pb-3 mb-3 mt-4">
                Stream Transport (TLS)
              </h6>

              <Row className="g-3 small">
                <Col md={12}>
                  <Form.Check
                    type="switch"
                    id="tcp-enabled-switch"
                    name="tcp_enabled"
                    checked={formData.tcp_enabled}
                    onChange={handleInputChange}
                    disabled={!isEditing || saving || configLocked}
                    label={
                      <span className="fw-semibold text-body">
                        Serve the stream rung
                      </span>
                    }
                    className="pointer-switch"
                  />
                </Col>
              </Row>

              {formData.tcp_enabled && (
                <Row className="g-3 small mt-1">
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="text-secondary fw-semibold">
                        Stream Listen Port (TCP)
                      </Form.Label>
                      <Form.Control
                        type="number"
                        name="tcp_port"
                        min={1}
                        max={65535}
                        className="font-monospace"
                        value={formData.tcp_port}
                        onChange={handleInputChange}
                        disabled={!isEditing || saving || infraLocked}
                        placeholder="443"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={8}>
                    <Form.Group className="mb-3">
                      <Form.Label className="text-secondary fw-semibold">
                        Stream rung needs a DNS endpoint
                      </Form.Label>
                      <Form.Text className="text-muted">
                        This server&apos;s <strong>Endpoint</strong> is also the
                        SNI its stream handshake presents. A DNS name here
                        enables the stream rung; an address or a blank disables
                        it. RFC 6066&apos;s SNI extension carries a hostname, so
                        a client sends no SNI at all for an IP address — a
                        passively observable tell no browser produces. Name your
                        servers so the names themselves are plausible on the
                        networks your users are on.
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
              )}

              {!isNew && (
                <>
                  <div className="pt-3 border-top mt-4">
                    <Row className="g-2 text-muted small font-monospace">
                      <Col sm={6}>
                        <span className="fw-semibold text-secondary">
                          Created:
                        </span>{" "}
                        {formatDate(formData.created_at)}
                      </Col>
                      <Col sm={6} className="text-sm-end">
                        <span className="fw-semibold text-secondary">
                          Last Updated:
                        </span>{" "}
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
                          {deleting ? "Deleting..." : "Delete Server"}
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
            Run this command on the new VPN server to install and connect the
            server agent.
          </p>
          <CopyableField
            label="VpnServer Bootstrap Command"
            value={bootstrapCommand}
            toastLabel="Bootstrap command"
          />
          <p className="text-warning small mb-0 mt-3">
            Keep this command private: it embeds the server bootstrap secret and
            will not be shown again.
          </p>
        </Card>
      )}
    </Container>
  );
};

const VpnServerDetail = () => {
  const { id } = useParams();
  const isNew = id === "new";

  const {
    data: server,
    isLoading,
    isError,
    error,
    refetch,
  } = useVpnServerDetail(id);

  usePageTitle(isNew ? "Create VPN Server" : `Server ${id || ""} Details`);

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
        key={server?.id || "new"}
        initialData={server}
        isNew={isNew}
        refetchData={refetch}
      />
    </DetailShell>
  );
};

export default VpnServerDetail;
