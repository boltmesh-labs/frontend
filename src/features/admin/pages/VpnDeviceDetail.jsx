import React, { useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Card, Row, Col, Button, Spinner } from 'react-bootstrap';

import { useConfirm } from '@/hooks/useConfirm';
import { useCopied } from '@/hooks/useCopied';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useVpnDeviceDetail, useToggleVpnDeviceStatus } from '@/features/admin/hooks/useVpnDevices';
import { useUserDetail } from '@/features/admin/hooks/useUsers';
import { formatDate } from '@/utils/dateFormatter';
import { formatBytes } from '@/utils/byteFormatter';
import { copyToClipboard } from '@/utils/clipboard';

import { DetailShell } from '@/components/DetailShell';
import { DataTable } from '@/components/DataTable';
import { VpnDeviceStateBadge } from '@/components/VpnDeviceStateBadge';
import { DetailHeader } from '../components/DetailHeader';
import { AccountOwnerCard } from '../components/DetailAccount';
import { LinkedCard } from '../components/DetailLinked';
import { DetailSummary } from '../components/DetailSummary';

const PEER_TABLE_COLUMNS = [
  { header: 'Peer' },
  { header: 'Public Key' },
  { header: 'IP Address' },
  { header: 'Server' },
  { header: 'Status' },
  { header: 'Connected' },
  { header: 'Last Active' },
  { header: 'Created' },
  { header: 'Tx / Rx' },
];

const PeerRow = React.memo(({ peer }) => {
  // useCopied clears its reset timer on unmount — the previous bare
  // setTimeout here could fire setState after the row was gone.
  const { copied, markCopied } = useCopied();

  const handleCopyKey = async () => {
    if (!peer.public_key) return;
    const didCopy = await copyToClipboard(peer.public_key, {
      success: 'Public key copied to clipboard!',
      error: 'Failed to copy public key.',
    });
    if (didCopy) markCopied();
  };

  return (
    <tr>
      <td className="font-monospace fw-bold text-secondary small text-break">
        <Link
          to={`/admin/vpn-devices/peer/${peer.id}`}
          className="text-primary text-decoration-none"
        >
          {peer.id}
        </Link>
      </td>
      <td>
        {peer.public_key ? (
          <div className="d-flex align-items-center gap-1">
            <span
              className="font-monospace text-truncate user-select-all text-body"
              style={{ maxWidth: '100px' }}
              title={peer.public_key}
            >
              {peer.public_key}
            </span>
            <Button
              variant="light"
              size="sm"
              className="py-0 px-1 border-0 bg-transparent text-secondary"
              onClick={handleCopyKey}
              title="Copy Public Key"
              aria-label="Copy public key"
            >
              {copied ? '✓' : '📋'}
            </Button>
          </div>
        ) : (
          <span className="font-monospace text-muted">—</span>
        )}
      </td>
      <td className="font-monospace text-body">{peer.assigned_ip || '—'}</td>
      <td className="font-monospace small text-break">
        {peer.server_id ? (
          <Link
            to={`/admin/vpn-servers/${peer.server_id}`}
            className="text-primary text-decoration-none"
            title={`View server ${peer.server_id}`}
          >
            {peer.server_id}
          </Link>
        ) : (
          <span className="font-monospace text-muted">—</span>
        )}
      </td>
      <td>
        <VpnDeviceStateBadge isActive={peer?.is_active} />
      </td>
      <td className="text-muted">
        <span className="d-inline-flex align-items-center gap-2">
          <span
            className={`rounded-circle ${peer.is_connected ? 'bg-success' : 'bg-danger'}`}
            style={{ width: '8px', height: '8px' }}
            aria-hidden="true"
          />
          <span className="small">{peer.is_connected ? 'Connected' : 'Disconnected'}</span>
        </span>
      </td>
      <td className="text-muted">{formatDate(peer.last_seen_at)}</td>
      <td className="text-muted">{formatDate(peer.created_at)}</td>
      <td className="text-muted">
        {formatBytes(peer.tx_bytes)} / {formatBytes(peer.rx_bytes)}
      </td>
    </tr>
  );
});
PeerRow.displayName = 'PeerRow';

const VpnDeviceDetail = () => {
  const { id } = useParams();

  usePageTitle(`VPN Device ${id}`);

  const { data: device, isLoading, isError, error, refetch } = useVpnDeviceDetail(id);
  const { data: user } = useUserDetail(device?.user_id);

  const userContext = user || {
    username: device?.user_id ? `User #${device.user_id}` : 'Unknown User',
    email: 'No email linked',
  };

  const { mutate: toggleDeviceStatus, isPending: isToggling } = useToggleVpnDeviceStatus();

  const { confirm, confirmDialog } = useConfirm();

  const handleToggleStatus = useCallback(
    async ({ id, isActive }) => {
      const actionLabel = isActive ? 'deactivate' : 'activate';
      const capitalized = actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1);

      const isConfirmed = await confirm({
        title: `${capitalized} Device`,
        message: `Are you sure you want to ${actionLabel} this VPN device?`,
        confirmText: capitalized,
        confirmVariant: isActive ? 'danger' : 'primary',
      });

      if (!isConfirmed) return;

      toggleDeviceStatus({ id, isActive });
    },
    [confirm, toggleDeviceStatus]
  );

  const summaryItems = useMemo(() => {
    if (!device) return [];

    return [
      {
        label: 'Display Name',
        value: device.name || 'Unnamed Device',
      },
      {
        label: 'Platform',
        value: (device.platform || 'N/A').toUpperCase(),
      },
      {
        label: 'Provisioned',
        value: formatDate(device.created_at),
        className: 'text-muted',
      },
      ...(device.last_active_at
        ? [
            {
              label: 'Last Active',
              value: formatDate(device.last_active_at),
              className: 'text-muted',
            },
          ]
        : []),
      {
        label: 'Last Modified',
        value: formatDate(device.updated_at || device.created_at),
        className: 'text-muted',
      },
    ];
  }, [device]);

  return (
    <DetailShell
      loading={isLoading}
      error={isError ? error : null}
      data={device}
      refetch={refetch}
      notFoundMessage="VPN device record not found."
    >
      <Container className="py-4">
        {confirmDialog}
        <DetailHeader
          title="VPN Device"
          id={device?.id}
          badge={<VpnDeviceStateBadge isActive={device?.is_active} />}
          actions={
            <Button
              variant={device?.is_active ? 'outline-warning' : 'outline-success'}
              className="shadow-sm"
              disabled={isToggling}
              onClick={() => handleToggleStatus({ id: device?.id, isActive: device?.is_active })}
              aria-label={`${device?.is_active ? 'Deactivate' : 'Activate'} device`}
            >
              {isToggling ? (
                <Spinner size="sm" animation="border" className="me-1" />
              ) : device?.is_active ? (
                '⏸ Deactivate'
              ) : (
                '▶ Activate'
              )}
            </Button>
          }
        />

        <Row className="g-4 mb-4">
          <Col lg={8}>
            <DetailSummary
              statusLabel="Device Status"
              badge={<VpnDeviceStateBadge isActive={device?.is_active} />}
              items={summaryItems}
            />
          </Col>

          <Col lg={4} className="d-flex flex-column gap-4">
            <AccountOwnerCard user={userContext} />

            {device?.subscription?.id && (
              <LinkedCard
                uuid={String(device.subscription.id)}
                label="Linked Subscription 📅"
                targetUrl={`/admin/subscriptions/${device.subscription.id}`}
              />
            )}
          </Col>
        </Row>

        <Card className="border-0 shadow-sm bg-body-tertiary p-4 rounded-3">
          <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
            <div>
              <h5 className="fw-bold text-body m-0">Associated Peers</h5>
              <p className="text-muted small m-0">
                All active and historical VPN peers registered under this device.
              </p>
            </div>
          </div>

          <DataTable
            columns={PEER_TABLE_COLUMNS}
            data={Array.isArray(device?.peers) ? device.peers : []}
            renderRow={(peer) => <PeerRow key={peer.id} peer={peer} />}
            emptyMessage="No VPN peers found for this device."
          />
        </Card>
      </Container>
    </DetailShell>
  );
};

export default VpnDeviceDetail;
