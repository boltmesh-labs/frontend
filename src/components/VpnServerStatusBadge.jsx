import { StatusBadge } from '@/components/StatusBadge';
import { serverStatusVariant } from '@/utils/badgeVariants';

/**
 * Server status badge: a thin specialization of the generic `StatusBadge`
 * driven by the shared `serverStatusVariant` map.
 */
export const VpnServerStatusBadge = ({ status }) => (
  <StatusBadge status={status} variantMap={serverStatusVariant} />
);
