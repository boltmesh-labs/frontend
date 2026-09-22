import { Button, Modal } from 'react-bootstrap';

/**
 * Reusable Confirmation Modal
 */
export const ConfirmModal = ({
  show,
  onHide,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  loading = false,
}) => {
  return (
    <Modal show={show} onHide={onHide} centered backdrop={loading ? 'static' : true}>
      <Modal.Header closeButton={!loading}>
        <Modal.Title className="fw-bold text-body fs-5">{title}</Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4 text-start">
        {typeof message === 'string' ? <p className="mb-0">{message}</p> : message}
      </Modal.Body>

      <Modal.Footer>
        <Button
          variant="outline-secondary"
          onClick={onHide}
          disabled={loading}
          className="fw-bold px-3"
        >
          {cancelText}
        </Button>
        <Button
          variant={confirmVariant}
          onClick={onConfirm}
          disabled={loading}
          className="fw-bold px-4 shadow-sm d-inline-flex align-items-center gap-2"
        >
          {loading && (
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
          )}
          {confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
