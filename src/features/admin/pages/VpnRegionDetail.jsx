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

import { usePageTitle } from "@/hooks/usePageTitle";
import { useConfirm } from "@/hooks/useConfirm";
import {
  useVpnRegionDetail,
  useCreateVpnRegion,
  useUpdateVpnRegion,
  useDeleteVpnRegion,
} from "@/features/admin/hooks/useVpnRegions";
import { DetailShell } from "@/components/DetailShell";
import { DetailHeader } from "../components/DetailHeader";
import { StatusBadge } from "@/components/StatusBadge";

import { formatDate } from "@/utils/dateFormatter";

const REGION_STATUS_VARIANTS = { active: "success", inactive: "secondary" };

const OBFUSCATION_MODE_AWG = "awg";

// The flat form field names, in render order. Kept as data so the section is one
// map instead of fifteen near-identical JSX blocks.
const OBFUSCATION_PARAM_FIELDS = [
  { label: "Junk Count (Jc)", name: "jc", max: 128 },
  { label: "Junk Min (Jmin)", name: "jmin", max: 1500 },
  { label: "Junk Max (Jmax)", name: "jmax", max: 1500 },
  { label: "Init Padding S1", name: "s1", max: 1500 },
  { label: "Init Padding S2", name: "s2", max: 1500 },
  { label: "Init Padding S3", name: "s3", max: 1500 },
  { label: "Init Padding S4", name: "s4", max: 1500 },
];

const OBFUSCATION_HEADER_FIELDS = [1, 2, 3, 4].flatMap((index) => [
  { label: `Magic Header H${index} low`, name: `h${index}_lo` },
  { label: `Magic Header H${index} high`, name: `h${index}_hi` },
]);

// The descriptor is nested ({mode, params}) but the form is flat, so the two
// halves of the mapping live together: one flattens for editing, the other
// rebuilds the wire object on save. Blank numeric inputs are "not set" rather
// than 0 — the backend requires every field once mode is "awg".
const mapObfuscationToForm = (obfuscation) => {
  const params = obfuscation?.params || {};
  return {
    obfuscation_mode: obfuscation?.mode || "",
    jc: params.jc ?? "",
    jmin: params.jmin ?? "",
    jmax: params.jmax ?? "",
    s1: params.s1 ?? "",
    s2: params.s2 ?? "",
    s3: params.s3 ?? "",
    s4: params.s4 ?? "",
    h1_lo: params.h1?.[0] ?? "",
    h1_hi: params.h1?.[1] ?? "",
    h2_lo: params.h2?.[0] ?? "",
    h2_hi: params.h2?.[1] ?? "",
    h3_lo: params.h3?.[0] ?? "",
    h3_hi: params.h3?.[1] ?? "",
    h4_lo: params.h4?.[0] ?? "",
    h4_hi: params.h4?.[1] ?? "",
  };
};

const toOptionalNumber = (value) =>
  value === "" || value === null || value === undefined ? null : Number(value);

const buildObfuscationPayload = (formData) => {
  if (formData.obfuscation_mode !== OBFUSCATION_MODE_AWG) return null;
  return {
    mode: OBFUSCATION_MODE_AWG,
    params: {
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
    },
  };
};

const randomInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

// A well-formed starting point, not a policy: which parameters actually evade a
// given censor is an operator decision, so this only guarantees the shape the
// AmneziaWG device requires — in-range junk and padding, and four
// pairwise-disjoint magic-header ranges drawn well above the standard WireGuard
// message types. Each range sits in its own slot, so it can never overlap a
// neighbour.
const generateObfuscationProfile = () => {
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
    obfuscation_mode: OBFUSCATION_MODE_AWG,
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

const ObfuscationNumberField = ({
  label,
  name,
  value,
  onChange,
  disabled,
  max,
}) => (
  <Col md={3}>
    <Form.Group className="mb-3" controlId={`obfuscation-${name}`}>
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

const mapRegionToForm = (region) => ({
  id: region?.id || "",
  name: region?.name || "",
  country_code: region?.country_code || "",
  is_active: region?.is_active ?? true,
  ...mapObfuscationToForm(region?.obfuscation),
  created_at: region?.created_at || null,
  updated_at: region?.updated_at || null,
});

const VpnRegionForm = ({ initialData, isNew, refetchData }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm, confirmDialog } = useConfirm();

  const [isEditing, setIsEditing] = useState(isNew);
  const [formData, setFormData] = useState(() => mapRegionToForm(initialData));
  // Open by default when the region already runs AWG, so the live profile is
  // visible without a click; collapsed otherwise to keep the common (native)
  // form short.
  const [showObfuscation, setShowObfuscation] = useState(
    () => initialData?.obfuscation?.mode === OBFUSCATION_MODE_AWG,
  );

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
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleGenerateProfile = () => {
    setFormData((prev) => ({ ...prev, ...generateObfuscationProfile() }));
    setShowObfuscation(true);
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();

    const payload = {
      name: formData.name.trim(),
      country_code: formData.country_code.trim().toUpperCase(),
      is_active: formData.is_active,
      // Always sent: null is the native data plane, which is how the form turns
      // AWG off. The backend treats a write that matches the stored profile as a
      // no-op, so an unrelated edit is never refused by the online-servers gate.
      obfuscation: buildObfuscationPayload(formData),
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
      title: "Delete VPN Region",
      message: `Are you sure you want to delete "${formData.name || id}"? This action cannot be undone.`,
      confirmText: "Delete Region",
      confirmVariant: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(id);
      navigate("/admin/vpn-regions");
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
              ? "Create Region"
              : "Save Changes"}
        </Button>
      </>
    );
  };

  return (
    <Container className="py-5">
      {confirmDialog}
      <DetailHeader
        title={isNew ? "Create VPN Region" : initialData?.name || "VPN Region"}
        idPrefix="Region ID:"
        id={isNew ? "NEW_REGION" : initialData?.id}
        badge={
          !isNew && (
            <StatusBadge
              status={initialData?.is_active ? "active" : "inactive"}
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
                    <Form.Label className="text-secondary fw-semibold">
                      Region ID
                    </Form.Label>
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
                    <Form.Label className="text-secondary fw-semibold">
                      Region Name
                    </Form.Label>
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
                    <Form.Label className="text-secondary fw-semibold">
                      Country Code
                    </Form.Label>
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
                        Region Active — new devices and peers can be provisioned
                        in this region
                      </span>
                    }
                    className="pointer-switch"
                  />
                </Col>
              </Row>

              <div className="pt-3 border-top mt-4">
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="fw-bold text-body mb-0">
                    AmneziaWG Obfuscation Profile
                  </h6>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="text-decoration-none"
                    onClick={() => setShowObfuscation((open) => !open)}
                  >
                    {showObfuscation ? "Hide" : "Show"}
                  </Button>
                </div>

                <Row className="g-3 small mt-1">
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="text-secondary fw-semibold">
                        Data Plane
                      </Form.Label>
                      <Form.Select
                        name="obfuscation_mode"
                        value={formData.obfuscation_mode}
                        onChange={handleInputChange}
                        disabled={!isEditing || saving}
                      >
                        <option value="">Native WireGuard</option>
                        <option value={OBFUSCATION_MODE_AWG}>
                          AmneziaWG (obfuscated)
                        </option>
                      </Form.Select>
                      <Form.Text className="text-muted">
                        Region-scoped: every node and client here runs these
                        parameters, and a node only reads them at registration.
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  {formData.obfuscation_mode === OBFUSCATION_MODE_AWG && (
                    <Col md={8} className="d-flex align-items-start pt-1">
                      <Button
                        type="button"
                        variant="outline-secondary"
                        size="sm"
                        onClick={handleGenerateProfile}
                        disabled={!isEditing || saving}
                      >
                        Generate valid profile
                      </Button>
                    </Col>
                  )}
                </Row>

                <Collapse in={showObfuscation}>
                  <div>
                    <Row className="g-3 small">
                      {OBFUSCATION_PARAM_FIELDS.map((field) => (
                        <ObfuscationNumberField
                          key={field.name}
                          {...field}
                          value={formData[field.name]}
                          onChange={handleInputChange}
                          disabled={!isEditing || saving}
                        />
                      ))}
                    </Row>
                    <Row className="g-3 small">
                      {OBFUSCATION_HEADER_FIELDS.map((field) => (
                        <ObfuscationNumberField
                          key={field.name}
                          {...field}
                          value={formData[field.name]}
                          onChange={handleInputChange}
                          disabled={!isEditing || saving}
                        />
                      ))}
                    </Row>
                    <Form.Text className="text-muted d-block">
                      Each magic header is a [low, high] range; the four ranges
                      must not overlap. Padding and junk sizes are in bytes.
                    </Form.Text>
                  </div>
                </Collapse>
              </div>

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
                  {!isEditing && (
                    <div className="pt-3 border-top mt-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
                      <div>
                        <Button
                          variant="outline-danger"
                          className="fw-bold rounded-3"
                          onClick={handleDelete}
                          disabled={saving || deleting}
                        >
                          {deleting ? "Deleting..." : "Delete Region"}
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
  const isNew = id === "new";

  const {
    data: region,
    isLoading,
    isError,
    error,
    refetch,
  } = useVpnRegionDetail(id);

  usePageTitle(isNew ? "Create VPN Region" : `Region ${id || ""} Details`);

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
        key={region?.id || "new"}
        initialData={region}
        isNew={isNew}
        refetchData={refetch}
      />
    </DetailShell>
  );
};

export default VpnRegionDetail;
