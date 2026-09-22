import { Badge } from 'react-bootstrap';
import { badgeClassName } from '@/utils/badgeVariants';

export const VpnDeviceStateBadge = ({ isActive }) => {
  const variant = isActive ? 'success' : 'secondary';

  return (
    <Badge bg={variant} className={badgeClassName(variant)}>
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );
};
