import { Badge } from 'react-bootstrap';
import { badgeClassName, getStatusVariant, userRoleVariant } from '@/utils/badgeVariants';

// Base reusable component to encapsulate styling and accessibility
const BaseBadge = ({ bg, children }) => (
  <Badge bg={bg} role="status" className={badgeClassName(bg)}>
    {children}
  </Badge>
);

export const UserRoleBadge = ({ role = 'unknown' }) => (
  <BaseBadge bg={getStatusVariant(role, userRoleVariant)}>{role}</BaseBadge>
);

export const UserStateBadge = ({ isActive = false }) => (
  <BaseBadge bg={isActive ? 'success' : 'danger'}>{isActive ? 'Active' : 'Inactive'}</BaseBadge>
);

export const UserVerifiedBadge = ({ isVerified = false }) => (
  <BaseBadge bg={isVerified ? 'success' : 'warning'}>
    {isVerified ? 'Verified' : 'Unverified'}
  </BaseBadge>
);
