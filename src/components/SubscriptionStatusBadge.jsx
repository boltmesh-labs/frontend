import { subscriptionStatusVariant } from '@/utils/badgeVariants';
import { StatusBadge } from '@/components/StatusBadge';

export const SubscriptionStatusBadge = (props) => (
  <StatusBadge {...props} variantMap={subscriptionStatusVariant} />
);
