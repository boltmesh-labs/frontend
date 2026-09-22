import { invoiceStatusVariant } from '@/utils/badgeVariants';
import { StatusBadge } from '@/components/StatusBadge';

export const InvoiceStatusBadge = (props) => (
  <StatusBadge {...props} variantMap={invoiceStatusVariant} />
);
