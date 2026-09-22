import { Spinner } from 'react-bootstrap';

export const LoadingOverlay = ({ show, message }) => {
  if (!show) return null;

  return (
    <div
      className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center bg-body-tertiary rounded"
      style={{ opacity: 0.75, zIndex: 5 }}
    >
      <Spinner animation="border" variant="primary" className={message ? 'mb-2' : ''} />
      {message && <p className="text-muted small m-0">{message}</p>}
    </div>
  );
};
