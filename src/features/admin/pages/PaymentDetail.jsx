import { useCallback, useMemo } from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';

import { usePageTitle } from '@/hooks/usePageTitle';
import { usePaymentDetail } from '@/features/admin/hooks/usePayments';
import { useUserDetail } from '@/features/admin/hooks/useUsers';
import { DetailShell } from '@/components/DetailShell';
import { PaymentStatusBadge } from '@/components/PaymentStatusBadge';
import { CopyableField } from '@/components/CopyableField';
import { DetailHeader } from '../components/DetailHeader';
import { LinkedCard } from '../components/DetailLinked';
import { AccountOwnerCard } from '../components/DetailAccount';
import { DetailSummary } from '../components/DetailSummary';
import { formatCurrencyAmount } from '@/utils/currencyFormatter';
import { getMethodDisplay } from '@/utils/methodDisplay';
import { formatDate } from '@/utils/dateFormatter';
import { COMPANY_NAME } from '@/utils/config';

const PaymentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: payment, isLoading, isError, error, refetch } = usePaymentDetail(id);
  const { data: ownerUser } = useUserDetail(payment?.invoice?.user_id);

  usePageTitle(`Payment ${id || ''} Detail | ${COMPANY_NAME}`, `Details of payment.`);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const rawConfirmations = payment?.confirmations;
  const currency = payment?.invoice?.currency || 'USD';

  const userContext = ownerUser || {
    username: payment?.invoice?.user_id ? `User #${payment.invoice.user_id}` : 'System User',
    email: 'No email linked',
  };

  const summaryItems = useMemo(() => {
    if (!payment) return [];

    const items = [
      {
        label: 'Payment Method',
        value: getMethodDisplay(payment.invoice?.payment_method),
      },
      {
        label: 'Currency',
        value: currency,
        className: 'fw-bold text-body text-uppercase',
      },
      {
        label: 'Gross Amount',
        value: formatCurrencyAmount(payment.amount ?? 0, currency),
      },
      {
        label: 'Processing Fee',
        value: formatCurrencyAmount(payment.fee ?? 0, currency),
      },
    ];

    if (rawConfirmations != null) {
      items.push({
        label: 'Network Confirmations',
        value: `${rawConfirmations} ${rawConfirmations === 1 ? 'confirmation' : 'confirmations'}`,
      });
    }

    items.push({
      label: 'Date Created',
      value: formatDate(payment.created_at),
      className: 'text-muted',
    });

    return items;
  }, [payment, currency, rawConfirmations]);

  return (
    <DetailShell
      loading={isLoading}
      error={isError ? error : null}
      data={payment}
      refetch={refetch}
      notFoundMessage="Payment record could not be found or loaded."
      onBack={handleBack}
      backLabel="↩ Back to List"
    >
      <Container className="py-4 position-relative min-vh-50">
        <DetailHeader title="Payment" id={payment?.id || id} />

        {payment && (
          <Row className="g-4">
            <Col lg={8}>
              <DetailSummary
                statusLabel="Settlement Status"
                badge={<PaymentStatusBadge status={payment.status} />}
                items={summaryItems}
              >
                {payment.external_tx_id && (
                  <CopyableField
                    label="External Transaction / Hash ID"
                    value={payment.external_tx_id}
                    toastLabel="TXID"
                    className="mt-4 p-3 rounded-3 border bg-body"
                  />
                )}
              </DetailSummary>
            </Col>

            <Col lg={4} className="d-flex flex-column gap-4">
              <AccountOwnerCard user={userContext} />
              {payment.invoice_id && (
                <LinkedCard
                  uuid={payment.invoice_id}
                  label="Linked Invoice 📄"
                  targetUrl={`/admin/invoices/${payment.invoice_id}`}
                />
              )}
            </Col>
          </Row>
        )}
      </Container>
    </DetailShell>
  );
};

export default PaymentDetail;
