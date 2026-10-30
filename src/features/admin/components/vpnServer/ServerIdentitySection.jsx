import { Col, Form, Row } from "react-bootstrap";

import { VPN_SERVER_STATUSES } from "@/constants/statuses";

const LOCKABLE_STATUSES = [
  VPN_SERVER_STATUSES.online,
  VPN_SERVER_STATUSES.maintenance,
  VPN_SERVER_STATUSES.decommissioned,
];

/**
 * Name, region, status and OS — the identity half of the server form.
 *
 * The origin notice explains why the Terraform-owned fields are locked on an
 * AMI-provisioned row; `isManualServer` is not needed because this only ever
 * renders on an existing server, where it is the exact complement of
 * `isAmiServer`.
 */
export const ServerIdentitySection = ({
  formData,
  onChange,
  isEditing,
  saving,
  isNew,
  isAmiServer,
  infraLocked,
  configLocked,
  regions,
}) => {
  const {
    data: regionsData,
    isLoading: regionsLoading,
    isError: regionsError,
  } = regions;

  return (
    <>
      {!isNew && (
        <div className="mb-3">
          {isAmiServer ? (
            <div className="alert alert-warning py-2 mb-0 small" role="note">
              Auto-provisioned (AMI): Terraform owns the name, region, addresses
              and ports. The OS and tunnel address are editable while the server
              is provisioning or maintenance.
            </div>
          ) : (
            <span className="badge text-bg-info">
              Manual topology. Server/service restart required to apply changes.
            </span>
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
              onChange={onChange}
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
              onChange={onChange}
              disabled={!isEditing || saving || regionsLoading || infraLocked}
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
                Regions could not be loaded; the server will be saved without a
                region.
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
                onChange={onChange}
                disabled={saving}
              >
                <option value={VPN_SERVER_STATUSES.provisioning}>
                  Provisioning
                </option>
              </Form.Select>
            ) : (
              <Form.Select
                name="status"
                className="font-monospace"
                value={formData.status}
                onChange={onChange}
                disabled={!isEditing || saving}
              >
                <option value={VPN_SERVER_STATUSES.online}>Online</option>
                <option value={VPN_SERVER_STATUSES.maintenance}>
                  Maintenance
                </option>
                <option value={VPN_SERVER_STATUSES.decommissioned}>
                  Decommissioned
                </option>
                {!LOCKABLE_STATUSES.includes(formData.status) && (
                  <option value={formData.status} disabled>
                    {formData.status}
                  </option>
                )}
              </Form.Select>
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
              onChange={onChange}
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
    </>
  );
};
