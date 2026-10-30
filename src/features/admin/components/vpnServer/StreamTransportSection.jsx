import { Col, Form, Row } from "react-bootstrap";

/**
 * The TLS stream rung. Its listen port is Terraform-owned on an AMI row, while
 * the switch itself is governed by the status window like every other config
 * field.
 */
export const StreamTransportSection = ({
  formData,
  onChange,
  isEditing,
  saving,
  infraLocked,
  configLocked,
}) => (
  <>
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
          onChange={onChange}
          disabled={!isEditing || saving || configLocked}
          label={
            <span className="fw-semibold text-body">Serve the stream rung</span>
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
              onChange={onChange}
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
              This server&apos;s <strong>Endpoint</strong> is also the SNI its
              stream handshake presents. A DNS name here enables the stream
              rung; an address or a blank disables it. RFC 6066&apos;s SNI
              extension carries a hostname, so a client sends no SNI at all for
              an IP address — a passively observable tell no browser produces.
              Name your servers so the names themselves are plausible on the
              networks your users are on.
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>
    )}
  </>
);
