import { Button, Card, Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { COMPANY_NAME } from '@/utils/config';

const PageContainer = ({ children }) => (
  <Container className="d-flex justify-content-center align-items-center min-vh-100 py-5">
    {children}
  </Container>
);

const Unauthorized = () => {
  const navigate = useNavigate();

  usePageTitle(
    `Access Denied | ${COMPANY_NAME}`,
    'You do not have permission to access this page.'
  );

  return (
    <PageContainer>
      <Card
        className="p-4 shadow-sm border-0 text-center bg-body-tertiary w-100 rounded-3"
        style={{ maxWidth: '460px' }}
      >
        <Card.Body>
          <div className="mb-3" style={{ fontSize: '2.5rem' }} role="img" aria-label="Padlock">
            🔒
          </div>
          <h3 className="fw-bold text-body mb-2">Access Denied</h3>
          <p className="text-secondary small mb-4">
            You do not have the permissions to view this page. Please contact support if you believe
            this is an error.
          </p>
          <Button
            variant="primary"
            onClick={() => navigate(-1)}
            className="w-100 fw-bold py-2 shadow-sm"
          >
            Go Back
          </Button>
        </Card.Body>
      </Card>
    </PageContainer>
  );
};

export default Unauthorized;
