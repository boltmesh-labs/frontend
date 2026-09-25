import { Card, Container } from 'react-bootstrap';

export const AuthContainer = ({ children }) => (
  <Container className="min-vh-100 d-flex align-items-center justify-content-center py-5">
    <Card className="shadow-sm border-0 rounded-3 p-3 w-100" style={{ maxWidth: '420px' }}>
      <Card.Body>{children}</Card.Body>
    </Card>
  </Container>
);
