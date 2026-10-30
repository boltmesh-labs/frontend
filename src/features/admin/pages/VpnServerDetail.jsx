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
import { DetailHeader } from "../components/DetailHeader";
import { AmneziaWgSection } from "../components/vpnServer/AmneziaWgSection";
import { BootstrapCommandCard } from "../components/vpnServer/BootstrapCommandCard";
import { ServerFooter } from "../components/vpnServer/ServerFooter";
import { ServerIdentitySection } from "../components/vpnServer/ServerIdentitySection";
import { StreamTransportSection } from "../components/vpnServer/StreamTransportSection";
import { WireGuardSection } from "../components/vpnServer/WireGuardSection";
import { buildAwgParams, generateAwgParams } from "../utils/awg";
import {
  DEFAULT_OS,
  DEFAULT_STATUS,
  mapServerToForm,
} from "../utils/vpnServerForm";
import { VPN_SERVER_STATUSES } from "@/constants/statuses";

const VpnServerForm = ({ initialData, isNew, refetchData }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm, confirmDialog } = useConfirm();

  const [isEditing, setIsEditing] = useState(isNew);
  const [formData, setFormData] = useState(() =>
    mapServerToForm(initialData, isNew),
  );
  const [bootstrapCommand, setBootstrapCommand] = useState("");

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

  const sectionProps = {
    formData,
    onChange: handleInputChange,
    isEditing,
    saving,
    infraLocked,
    configLocked,
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

              <ServerIdentitySection
                {...sectionProps}
                isNew={isNew}
                isAmiServer={isAmiServer}
                regions={{
                  data: regionsData,
                  isLoading: regionsLoading,
                  isError: regionsError,
                }}
              />

              <WireGuardSection {...sectionProps} isNew={isNew} />

              <AmneziaWgSection
                {...sectionProps}
                initialParamsOpen={initialData?.awg_enabled === true}
                onGenerate={handleGenerateAwgParams}
              />

              <StreamTransportSection {...sectionProps} />

              <ServerFooter
                formData={formData}
                isNew={isNew}
                isEditing={isEditing}
                saving={saving}
                deleting={deleting}
                isDeletable={isDeletable}
                onDelete={handleDelete}
              />
            </Card>
          </Col>
        </Row>
      </Form>

      <BootstrapCommandCard command={bootstrapCommand} />
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
