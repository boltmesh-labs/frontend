import { useCallback, useMemo } from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';

import { usePageTitle } from '@/hooks/usePageTitle';
import { useVpnPeerDetail } from '@/features/admin/hooks/useVpnPeers';
import { formatDate } from '@/utils/dateFormatter';
import { formatBytes } from '@/utils/byteFormatter';
import { COMPANY_NAME } from '@/utils/config';

import { CopyableField } from '@/components/CopyableField';
import { DetailShell } from '@/components/DetailShell';
import { DetailHeader } from '../components/DetailHeader';
import { LinkedCard } from '../components/DetailLinked';
import { DetailSummary } from '../components/DetailSummary';

const VpnPeerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: peer, isLoading, isError, error, refetch } = useVpnPeerDetail(id);

  usePageTitle(
    `Peer ${id || ''} Detail | ${COMPANY_NAME}`,
    `Details of active VPN peer tunnel, network assignments, and peer status.`
  );

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const summaryItems = useMemo(() => {
    if (!peer) return [];

    const formattedTx = formatBytes(peer.tx_bytes ?? 0);
    const formattedRx = formatBytes(peer.rx_bytes ?? 0);

    return [
      {
        label: 'Assigned IP Address',
        value: peer.assigned_ip || 'N/A',
      },
      {
        label: 'Server ID',
        value: peer.server_id || 'N/A',
      },
      {
        label: 'Connected',
        value: (
          <span className="d-inline-flex align-items-center gap-2">
            <span
              className={`rounded-circle ${peer.is_connected ? 'bg-success' : 'bg-danger'}`}
              style={{ width: '8px', height: '8px' }}
              aria-hidden="true"
            />
            <span className="small">{peer.is_connected ? 'Connected' : 'Disconnected'}</span>
          </span>
        ),
        className: 'text-muted',
      },
      {
        label: 'Tx / Rx',
        value: `${formattedTx} / ${formattedRx}`,
      },
      {
        label: 'Last Active',
        value: peer.last_seen_at ? formatDate(peer.last_seen_at) : 'N/A',
      },
      {
        label: 'Date Created',
        value: peer.created_at ? formatDate(peer.created_at) : 'N/A',
        className: 'text-muted',
      },
      {
        label: 'Last Updated',
        value: peer.updated_at ? formatDate(peer.updated_at) : 'N/A',
        className: 'text-muted',
      },
    ];
  }, [peer]);

  return (
    <DetailShell
      loading={isLoading}
      error={isError ? error : null}
      data={peer}
      refetch={refetch}
      notFoundMessage="VPN peer record could not be found or loaded."
      onBack={handleBack}
      backLabel="↩ Back to List"
    >
      <Container className="py-4 position-relative min-vh-50">
        <DetailHeader title="VPN Peer" id={peer?.id || id} />

        <Row className="g-4">
          <Col lg={8}>
            <DetailSummary
              statusLabel="Peer Status"
              badge={
                <div className="d-flex align-items-center gap-2 fs-6 fw-bold">
                  <span
                    className={`d-inline-block rounded-circle ${peer?.is_active ? 'bg-success' : 'bg-danger'}`}
                    style={{ width: '8px', height: '8px' }}
                    aria-hidden="true"
                  />
                  <span>{peer?.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              }
              items={summaryItems}
            >
              {peer?.public_key && (
                <CopyableField
                  label="WireGuard Public Key"
                  value={peer.public_key}
                  toastLabel="Public Key"
                  className="mt-4 p-3 rounded-3 border bg-body"
                />
              )}
            </DetailSummary>
          </Col>

          <Col lg={4} className="d-flex flex-column gap-4">
            {peer?.device_id && (
              <LinkedCard
                uuid={peer.device_id}
                label="Linked Device 📱"
                targetUrl={`/admin/vpn-devices/${peer.device_id}`}
              />
            )}
            {peer?.server_id && (
              <LinkedCard
                uuid={peer.server_id}
                label="Linked Server 🖧"
                targetUrl={`/admin/vpn-servers/${peer.server_id}`}
              />
            )}
          </Col>
        </Row>
      </Container>
    </DetailShell>
  );
};

export default VpnPeerDetail;
