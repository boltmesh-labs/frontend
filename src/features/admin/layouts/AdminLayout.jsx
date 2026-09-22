import { Suspense } from 'react';
import { Card, Col, ListGroup, Row } from 'react-bootstrap';
import { NavLink, Outlet } from 'react-router-dom';

import { PageLoader } from '@/components/PageLoader';

const ADMIN_LINKS = [
  { to: 'users', label: 'Users', icon: '👤' },
  { to: 'plans', label: 'Plans', icon: '📦' },
  { to: 'subscriptions', label: 'Subscriptions', icon: '📅' },
  { to: 'invoices', label: 'Invoices', icon: '🧾' },
  { to: 'payments', label: 'Payments & Transactions', icon: '💳' },
  { to: 'vpn-regions', label: 'VPN Regions', icon: '🌐' },
  { to: 'vpn-servers', label: 'VPN Servers', icon: '🖧' },
  { to: 'vpn-devices', label: 'VPN Devices', icon: '📱' },
];

const AdminLayout = () => {
  return (
    <Row className="g-4">
      <Col lg={3} md={4}>
        <Card className="shadow-sm border-0">
          <Card.Header className="bg-dark text-white py-3">
            <h5 className="mb-0 fw-bold">Admin Panel</h5>
          </Card.Header>

          <ListGroup variant="flush">
            {ADMIN_LINKS.map((link) => (
              <ListGroup.Item
                key={link.to}
                as={NavLink}
                to={link.to}
                action
                className="d-flex align-items-center"
              >
                <span
                  className="d-inline-flex align-items-center justify-content-center me-2"
                  style={{ width: '1.5rem', flexShrink: 0 }}
                >
                  {link.icon}
                </span>
                <span>{link.label}</span>
              </ListGroup.Item>
            ))}

            <ListGroup.Item
              as={NavLink}
              to="/dashboard"
              action
              className="border-0 border-top py-2 text-muted d-flex align-items-center"
            >
              <span
                className="d-inline-flex align-items-center justify-content-center me-2"
                style={{ width: '1.5rem', flexShrink: 0 }}
              >
                ↩️
              </span>
              <span>Back to Dashboard</span>
            </ListGroup.Item>
          </ListGroup>
        </Card>
      </Col>

      <Col lg={9} md={8}>
        <Card className="p-4 shadow-sm border-0 bg-body-tertiary min-vh-50">
          {/* Lazy admin pages suspend here so navigating between them never
              unmounts the layout itself. */}
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </Card>
      </Col>
    </Row>
  );
};

export default AdminLayout;
