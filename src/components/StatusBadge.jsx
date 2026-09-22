import { Badge } from 'react-bootstrap';
import { badgeClassName, getStatusVariant } from '@/utils/badgeVariants';

/**
 * Generic status badge driven by a variant map. Renders the lowercase status
 * humanized (underscores replaced with spaces), uppercased.
 */
export const StatusBadge = ({ status, variantMap }) => {
  const variant = getStatusVariant(status, variantMap);

  return (
    <Badge bg={variant} role="status" className={badgeClassName(variant)}>
      {String(status ?? '').replaceAll('_', ' ')}
    </Badge>
  );
};
