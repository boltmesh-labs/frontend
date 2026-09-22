import { Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';

/**
 * AccountOwnerCard displays user information inside detail views.
 */
export const AccountOwnerCard = ({ user, className = '' }) => {
  if (!user) return null;

  const avatarInitial = user.username !== 'N/A' ? user.username.charAt(0).toUpperCase() : '?';

  return (
    <Card className={`border-0 shadow-sm p-3 bg-body-tertiary rounded-3 ${className}`}>
      <div className="p-3 rounded-3 border mb-3">
        <div className="d-flex align-items-center gap-3">
          <div
            className="bg-primary text-white rounded-circle d-flex justify-content-center align-items-center fw-bold"
            style={{ width: '42px', height: '42px', flexShrink: 0 }}
            aria-hidden="true"
          >
            {avatarInitial}
          </div>

          <div>
            <span className="text-muted small d-block">User Profile</span>
            <Link
              to={`/admin/users/${user.id}`}
              className="fw-bold text-primary text-decoration-none d-block"
              title={`View user profile ${user.id}`}
            >
              {user.username}
            </Link>
          </div>
        </div>
      </div>

      <div className="small border-top pt-3">
        <div className="mb-2">
          <span className="text-secondary d-block">Email Address</span>
          <span className="fw-medium text-body text-break">{user.email}</span>
        </div>
      </div>
    </Card>
  );
};
