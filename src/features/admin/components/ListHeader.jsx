import { Row, Col } from 'react-bootstrap';

export const PageHeader = ({ title, description, children }) => {
  return (
    <Row className="mb-4 align-items-center">
      <Col>
        <h2 className="fw-bold text-body m-0">{title}</h2>
        {description && <p className="text-muted small m-0">{description}</p>}
      </Col>
      {children && <Col xs="auto">{children}</Col>}
    </Row>
  );
};
