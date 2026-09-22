import { Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export function LinkedCard({ uuid, label, targetUrl, className = '' }) {
  if (!uuid || !targetUrl) return null;

  return (
    <Card className={`border-0 shadow-sm rounded-3 ${className}`.trim()}>
      <div className="bg-body p-3 rounded-3 border mb-0">
        <div>
          <span className="text-secondary d-block font-monospace mb-1 small">{label}</span>
          <Link
            to={targetUrl}
            className="fw-bold text-primary text-decoration-none font-monospace fs-6"
            title={`View ${label} ${uuid}`}
          >
            {uuid}
          </Link>
        </div>
      </div>
    </Card>
  );
}
