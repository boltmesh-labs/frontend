import { Button, Card, Table } from 'react-bootstrap';
import { PageLoader } from '@/components/PageLoader';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  useUserDevices,
  useDeleteDevice,
  useUserSubscriptions,
  useDashboardProfile,
} from '@/features/dashboard/hooks/useDashboard';
import { DashboardContainer } from '@/features/dashboard/components/DashboardContainer';
import { DashboardHeader } from '../components/DashboardHeader';
import { formatDate } from '@/utils/dateFormatter';
import { formatBytes } from '@/utils/byteFormatter';
import { getPlatformLabel } from '@/utils/devicePlatformDisplay';
import { COMPANY_NAME } from '@/utils/config';
import { resolveActivePlan } from '../utils/activePlan';

const DeviceList = () => {
  const { runConfirmed, busy, confirmDialog } = useConfirmAction();

  usePageTitle(`VPN Devices | ${COMPANY_NAME}`, `View and manage your WireGuard VPN devices.`);

  const { data: devicesData, isLoading: devicesLoading, isError: devicesError } = useUserDevices();
  const { data: subscriptionData } = useUserSubscriptions();
  const { data: profileData } = useDashboardProfile();

  // List shapes are normalized to bare arrays inside the queryFns.
  const devices = devicesData ?? [];
  const activePlan = resolveActivePlan(profileData, subscriptionData);
  const maxDevices = activePlan?.max_devices;
  const usedDevices = devices.length;
  const slotsFull = Boolean(maxDevices) && usedDevices >= maxDevices;

  const deleteMutation = useDeleteDevice();

  // useConfirmAction owns the confirm dialog, busy flag, and success/error
  // feedback for the revoke flow.
  const handleRevokeDevice = (device) =>
    runConfirmed(device.id, {
      title: 'Revoke Device',
      message: `Are you sure you want to revoke access for "${device.name}"? This key will be permanently removed from the server, immediately disconnecting the device.`,
      confirmText: 'Confirm Revoke',
      confirmVariant: 'danger',
      run: () => deleteMutation.mutateAsync(device.id),
      successMessage: `Device "${device.name}" has been revoked.`,
    });

  if (devicesLoading) {
    return (
      <DashboardContainer>
        <PageLoader fullscreen={false} className="py-5" />
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <DashboardHeader
        title="VPN Devices"
        subtitle="Manage your connected devices and active VPN sessions"
      />

      {devicesError && (
        <div className="alert alert-danger text-start small mb-4" role="alert">
          Unable to load devices list. Please try refreshing the page.
        </div>
      )}

      {maxDevices ? (
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="p-3 d-flex flex-wrap align-items-center gap-3">
            <div className="me-auto text-start">
              <div className="text-body-secondary small fw-bold text-uppercase">Device Slots</div>
              <div className="small text-body-secondary">
                {activePlan?.name || 'Current'} plan allows up to {maxDevices} devices
              </div>
            </div>
            <div className="d-flex align-items-center gap-3">
              <span
                className={`fw-bold font-monospace ${
                  slotsFull ? 'text-danger' : 'text-body-emphasis'
                }`}
              >
                {usedDevices} / {maxDevices}
              </span>
              <div className="d-flex gap-1" role="progressbar" style={{ width: 120 }}>
                {Array.from({ length: maxDevices }).map((_, i) => (
                  <span
                    key={i}
                    className={`flex-fill rounded ${
                      i < usedDevices ? 'bg-success' : 'bg-body-secondary'
                    }`}
                    style={{ height: 8 }}
                  />
                ))}
              </div>
            </div>
          </Card.Body>
        </Card>
      ) : null}

      <Card className="border-0 shadow-sm bg-body-tertiary">
        <Card.Body className="p-0">
          {devices && devices.length > 0 ? (
            <Table responsive hover className="mb-0 align-middle text-start">
              <thead className="bg-body-secondary">
                <tr className="small text-uppercase text-body-secondary">
                  <th>Name</th>
                  <th>Platform</th>
                  <th>Connected / Last Active</th>
                  <th>Tx / Rx</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => {
                  const primaryPeer = device.peers?.[0];
                  const isConnected = primaryPeer?.is_connected ?? false;
                  const lastSeen = primaryPeer?.last_seen_at;
                  const txBytes = primaryPeer?.tx_bytes;
                  const rxBytes = primaryPeer?.rx_bytes;

                  return (
                    <tr key={device.id}>
                      <td className="ps-4 fw-bold text-body-emphasis">📱 {device.name}</td>
                      <td className="font-monospace small text-body-secondary">
                        {getPlatformLabel(device.platform)}
                      </td>
                      <td className="small">
                        <span className="d-inline-flex align-items-center gap-2">
                          <span
                            className={`rounded-circle ${
                              isConnected ? 'bg-success' : 'bg-secondary'
                            }`}
                            style={{ width: '8px', height: '8px' }}
                            aria-hidden="true"
                          />
                          <span className="small">
                            {isConnected ? 'Connected' : 'Disconnected'}
                          </span>
                        </span>
                        <div className="small text-body-secondary">
                          {lastSeen ? formatDate(lastSeen) : 'Never connected'}
                        </div>
                      </td>
                      <td className="text-muted small">
                        {formatBytes(txBytes ?? 0)} / {formatBytes(rxBytes ?? 0)}
                      </td>
                      <td className="text-end pe-4">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="ms-1"
                          onClick={() => handleRevokeDevice(device)}
                          disabled={busy !== null}
                        >
                          Revoke
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : (
            <div className="p-5 text-center">
              <div className="fs-1 mb-2">📱</div>
              <h5 className="fw-bold text-body-emphasis">No Active Devices</h5>
              <p className="text-body-secondary small mb-0">
                Devices are created from your client app after login — they will appear here once
                connected.
              </p>
            </div>
          )}
        </Card.Body>
      </Card>

      {confirmDialog}
    </DashboardContainer>
  );
};

export default DeviceList;
