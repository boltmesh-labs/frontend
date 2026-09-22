import { paymentStatusVariant } from '@/utils/badgeVariants';
import { StatusBadge } from '@/components/StatusBadge';

export const PaymentStatusBadge = (props) => (
  <StatusBadge {...props} variantMap={paymentStatusVariant} />
);
