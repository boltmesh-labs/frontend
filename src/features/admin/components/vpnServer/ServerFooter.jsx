import { Button, Col, Row } from "react-bootstrap";

import { formatDate } from "@/utils/dateFormatter";

/**
 * Audit stamps plus the hard-delete action. Delete is terminal and gated
 * server-side, so the control only appears once the row is decommissioned and
 * explains itself otherwise.
 */
export const ServerFooter = ({
  formData,
  isNew,
  isEditing,
  saving,
  deleting,
  isDeletable,
  onDelete,
}) => {
  if (isNew) return null;

  return (
    <>
      <div className="pt-3 border-top mt-4">
        <Row className="g-2 text-muted small font-monospace">
          <Col sm={6}>
            <span className="fw-semibold text-secondary">Created:</span>{" "}
            {formatDate(formData.created_at)}
          </Col>
          <Col sm={6} className="text-sm-end">
            <span className="fw-semibold text-secondary">Last Updated:</span>{" "}
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
              onClick={onDelete}
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
  );
};
