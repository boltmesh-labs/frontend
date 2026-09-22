import { Card } from 'react-bootstrap';

export const DashboardContainer = ({ children }) => (
  <Card className="shadow-sm border-0 rounded-3 p-3 w-100 mx-auto" style={{ maxWidth: '800px' }}>
    <Card.Body>{children}</Card.Body>
  </Card>
);
