import { useState } from "react";
import { Button, Col, Collapse, Form, Row } from "react-bootstrap";

import { AWG_HEADER_FIELDS, AWG_PARAM_FIELDS } from "../../utils/awg";

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

/**
 * The obfuscated rung: its own port and overlay, plus the AmneziaWG parameter
 * set. The parameters panel starts open when the stored server already runs
 * the rung, so live values are visible without a click.
 */
export const AmneziaWgSection = ({
  formData,
  onChange,
  isEditing,
  saving,
  infraLocked,
  configLocked,
  onGenerate,
  initialParamsOpen = false,
}) => {
  const [showParams, setShowParams] = useState(initialParamsOpen);

  const paramsDisabled = !isEditing || saving || configLocked;

  return (
    <>
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
            onChange={onChange}
            disabled={paramsDisabled}
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
                  onChange={onChange}
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
                  onChange={onChange}
                  disabled={paramsDisabled}
                  placeholder="e.g. 10.2.0.1/16"
                  required
                />
                <Form.Text className="text-muted">
                  A network of its own — the second device cannot share the
                  stock overlay.
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={4} className="d-flex align-items-start pt-1">
              <Button
                type="button"
                variant="link"
                size="sm"
                className="text-decoration-none"
                onClick={() => setShowParams((open) => !open)}
              >
                {showParams ? "Hide parameters" : "Show parameters"}
              </Button>
            </Col>
          </Row>

          <Collapse in={showParams}>
            <div>
              <Row className="g-3 small">
                {AWG_PARAM_FIELDS.map((field) => (
                  <AwgNumberField
                    key={field.name}
                    {...field}
                    value={formData[field.name]}
                    onChange={onChange}
                    disabled={paramsDisabled}
                  />
                ))}
              </Row>
              <Row className="g-3 small">
                {AWG_HEADER_FIELDS.map((field) => (
                  <AwgNumberField
                    key={field.name}
                    {...field}
                    value={formData[field.name]}
                    onChange={onChange}
                    disabled={paramsDisabled}
                  />
                ))}
              </Row>
              <div className="d-flex justify-content-between align-items-start gap-3">
                <Form.Text className="text-muted">
                  Each magic header is a [low, high] range; the four ranges must
                  not overlap. Padding and junk sizes are in bytes. Leave them
                  blank on create to have one generated per server.
                </Form.Text>
                <Button
                  type="button"
                  variant="outline-secondary"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() => {
                    onGenerate();
                    setShowParams(true);
                  }}
                  disabled={paramsDisabled}
                >
                  Generate
                </Button>
              </div>
            </div>
          </Collapse>
        </>
      )}
    </>
  );
};
