import { Col, Form, Row } from "react-bootstrap";

import { CopyableField } from "@/components/CopyableField";

/** The stock WireGuard rung: address, dial target, port and tunnel overlay. */
export const WireGuardSection = ({
  formData,
  onChange,
  isEditing,
  saving,
  isNew,
  infraLocked,
  configLocked,
}) => (
  <>
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
            onChange={onChange}
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
            onChange={onChange}
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
            onChange={onChange}
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
            onChange={onChange}
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
  </>
);
