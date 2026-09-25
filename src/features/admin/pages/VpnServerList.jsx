import { memo, useCallback, useState } from 'react';
import { Badge, Button, Col, Container, Form, Modal, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTableQuery } from '@/hooks/useTableQuery';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getPaginationTotals } from '@/utils/pagination';
import { useVpnServers, useToggleVpnServerStatus } from '@/features/admin/hooks/useVpnServers';
import { DataTable } from '@/components/DataTable';
import { StatusAlert } from '@/components/StatusAlert';
import { DefaultPagination } from '@/components/DefaultPagination';
import { TableFiltersBar } from '@/components/TableFiltersBar';
import { VpnServerStatusBadge } from '@/components/VpnServerStatusBadge';
import { PageHeader } from '../components/ListHeader';
import { formatDate, formatUptime } from '@/utils/dateFormatter';
import { formatBytes } from '@/utils/byteFormatter';
import { copyToClipboard } from '@/utils/clipboard';
import { VPN_SERVER_STATUSES } from '@/constants/statuses';

const TABLE_COLUMNS = [
  { header: 'Server Name' },
  { header: 'Region' },
  { header: 'System Status' },
  { header: 'Endpoint / Public IP' },
  { header: 'Actions', className: 'text-end' },
];

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Online', value: VPN_SERVER_STATUSES.online },
  { label: 'Provisioning', value: VPN_SERVER_STATUSES.provisioning },
  { label: 'Maintenance', value: VPN_SERVER_STATUSES.maintenance },
  { label: 'Offline', value: VPN_SERVER_STATUSES.offline },
  { label: 'Decommissioned', value: VPN_SERVER_STATUSES.decommissioned },
  { label: 'Error', value: VPN_SERVER_STATUSES.error },
];

const OS_OPTIONS = [
  { label: 'All OS', value: '' },
  { label: 'Rocky Linux', value: 'rocky' },
  { label: 'Ubuntu', value: 'ubuntu' },
  { label: 'Debian', value: 'debian' },
  { label: 'Alpine', value: 'alpine' },
];

const FILTERS = [
  {
    key: 'status',
    options: STATUS_OPTIONS,
    ariaLabel: 'Filter by server status',
  },
  {
    key: 'os',
    options: OS_OPTIONS,
    ariaLabel: 'Filter by server operating system',
  },
];

const VpnServerRow = memo(({ server, onToggleActive, onViewDetails, isProcessing }) => {
  const isUpdating = isProcessing === server.id;
  const currentStatus = server.status?.toLowerCase();

  const isOnline = currentStatus === VPN_SERVER_STATUSES.online;
  const isMaintenance = currentStatus === VPN_SERVER_STATUSES.maintenance;
  const isToggleable = isOnline || isMaintenance;

  const targetStatus = isOnline
    ? VPN_SERVER_STATUSES.maintenance
    : isMaintenance
      ? VPN_SERVER_STATUSES.online
      : null;

  return (
    <tr className="align-middle">
      <td className="fw-bold text-body">
        <Link to={`/admin/vpn-servers/${server.id}`} className="text-decoration-none text-primary">
          {server.name}
        </Link>
        <div>
          {server.is_manual === true ? (
            <Badge bg="info" className="px-2 py-1 fs-7">
              Manual
            </Badge>
          ) : (
            <Badge bg="warning" text="dark" className="px-2 py-1 fs-7">
              AMI
            </Badge>
          )}
        </div>
      </td>
      <td>
        {server.region?.id ? (
          <Link to={`/admin/vpn-regions/${server.region.id}`} className="text-decoration-none">
            <Badge bg="secondary" className="px-2 py-1 fs-7">
              🌐 {server.region.name || server.region.id}
            </Badge>
          </Link>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td>
        <Form.Check
          type="switch"
          id={`active-switch-${server.id}`}
          checked={isOnline}
          disabled={isUpdating || !isToggleable}
          onChange={() => {
            if (targetStatus) {
              onToggleActive(server.id, targetStatus);
            }
          }}
          aria-label={`Toggle active status for ${server.name}`}
          label={<VpnServerStatusBadge status={server.status} />}
          className="d-inline-flex align-items-center gap-2 pointer-switch"
        />
      </td>
      <td>
        <div className="font-monospace text-body fw-bold">
          {server.public_ip ? `${server.public_ip}` : '—'}
        </div>

        <div className="font-monospace text-muted">
          {server.endpoint ? `${server.endpoint}` : '—'}
        </div>
      </td>
      <td className="text-end">
        <Button
          variant="outline-primary"
          size="sm"
          className="fw-bold px-3 btn-sm shadow-sm"
          onClick={() => onViewDetails(server)}
        >
          View Config
        </Button>
      </td>
    </tr>
  );
});

VpnServerRow.displayName = 'VpnServerRow';

const VpnServerList = () => {
  const [selectedServer, setSelectedServer] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    searchInput,
    onSearchChange,
    clearFilters,
    isFiltered,
    params,
    filterConfigs,
  } = useTableQuery({ filters: FILTERS, pageSize: 10, debounceMs: 350 });

  const { data, isLoading, isError, error, refetch } = useVpnServers(params);

  const serversList = data?.data || [];
  const { totalCount, totalPages } = getPaginationTotals(data, pageSize);

  const {
    mutate: toggleVpnServerStatus,
    isPending: isToggling,
    variables: togglingVariables,
  } = useToggleVpnServerStatus();

  const processingId = isToggling ? togglingVariables?.id : null;

  const handleToggleActive = useCallback(
    (id, newStatus) => {
      toggleVpnServerStatus({ id, status: newStatus });
    },
    [toggleVpnServerStatus]
  );

  const handleOpenDetails = useCallback((server) => {
    setSelectedServer(server);
    setShowModal(true);
  }, []);

  const handleCloseDetails = () => {
    setSelectedServer(null);
    setShowModal(false);
  };

  const renderRow = useCallback(
    (server) => (
      <VpnServerRow
        key={server.id}
        server={server}
        onToggleActive={handleToggleActive}
        onViewDetails={handleOpenDetails}
        isProcessing={processingId}
      />
    ),
    [handleToggleActive, handleOpenDetails, processingId]
  );

  usePageTitle('VPN Server Nodes');

  return (
    <Container className="py-5">
      <PageHeader
        title="VPN Server Management"
        description="Monitor topology configurations, server access profiles, regions, and cryptographic credentials."
      >
        <Button
          as={Link}
          to="/admin/vpn-servers/audit"
          variant="outline-secondary"
          className="me-2 fw-bold px-3 shadow-sm"
        >
          📋 Audit Logs
        </Button>
        <Button
          as={Link}
          to="/admin/vpn-servers/new"
          variant="primary"
          className="fw-bold px-4 shadow-sm"
        >
          ➕ Create New Server
        </Button>
      </PageHeader>

      {isError && (
        <div className="mb-4">
          <StatusAlert message={error} onRetry={refetch} />
        </div>
      )}

      <TableFiltersBar
        searchInput={searchInput}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search by server name, public ip, endpoint, region, tunnel address or UUID..."
        filters={filterConfigs}
        onClear={clearFilters}
        isClearDisabled={isLoading || !isFiltered}
      />

      <DataTable
        columns={TABLE_COLUMNS}
        data={serversList}
        loading={isLoading}
        renderRow={renderRow}
        emptyMessage="No VPN Servers registered matching criteria."
      />

      <DefaultPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        loading={isLoading}
      />

      {selectedServer && (
        <Modal show={showModal} onHide={handleCloseDetails} size="lg" centered>
          <Modal.Header className="border-bottom-0 pt-4 px-4">
            <Modal.Title className="fw-bold text-body">🖧 {selectedServer.name}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="px-4 pb-4">
            <Row className="g-3">
              <Col md={4}>
                <span className="text-secondary small d-block">Last Seen</span>
                <span className="font-monospace fw-bold px-2 py-1 rounded border d-block mt-1 text-body">
                  {formatDate(selectedServer.last_seen_at) || '—'}
                </span>
              </Col>

              <Col md={4}>
                <span className="text-secondary small d-block">OS</span>
                <span className="font-monospace fw-bold px-2 py-1 rounded border d-block mt-1 text-body">
                  {selectedServer.os || '—'}
                </span>
              </Col>

              <Col md={4}>
                <span className="text-secondary small d-block">Agent Version</span>
                <span className="font-monospace fw-bold px-2 py-1 rounded border d-block mt-1 text-body">
                  {selectedServer.agent_version || '—'}
                </span>
              </Col>

              <Col md={3}>
                <span className="text-secondary small d-block">Uptime</span>
                <span className="font-monospace fw-bold px-2 py-1 rounded border d-block mt-1 text-body">
                  {formatUptime(selectedServer.uptime_seconds)}
                </span>
              </Col>

              <Col md={3}>
                <span className="text-secondary small d-block">Active Peers</span>
                <span className="font-monospace fw-bold px-2 py-1 rounded border d-block mt-1 text-body">
                  {selectedServer.active_peers ?? '—'}
                </span>
              </Col>

              <Col md={3}>
                <span className="text-secondary small d-block">Sent</span>
                <span className="font-monospace fw-bold px-2 py-1 rounded border d-block mt-1 text-body">
                  {formatBytes(selectedServer.tx_bytes)}
                </span>
              </Col>

              <Col md={3}>
                <span className="text-secondary small d-block">Received</span>
                <span className="font-monospace fw-bold px-2 py-1 rounded border d-block mt-1 text-body">
                  {formatBytes(selectedServer.rx_bytes)}
                </span>
              </Col>

              <Col md={4}>
                <span className="text-secondary small d-block">Public IP Address</span>
                <div className="d-flex align-items-center gap-2 mt-1">
                  <span className="font-monospace fw-bold px-2 py-1 rounded border text-body flex-grow-1">
                    {selectedServer.public_ip || '—'}
                  </span>
                </div>
              </Col>

              <Col md={6}>
                <span className="text-secondary small d-block">Endpoint</span>
                <span className="font-monospace fw-bold px-2 py-1 rounded border d-block mt-1 text-body">
                  {selectedServer.endpoint || '—'}
                </span>
              </Col>

              <Col md={2}>
                <span className="text-secondary small d-block">Port</span>
                <span className="font-monospace fw-bold px-2 py-1 rounded border d-block mt-1 text-body">
                  {selectedServer.wg_port ?? '—'}
                </span>
              </Col>

              <Col md={4}>
                <span className="text-secondary small d-block">Tunnel Address</span>
                <span className="font-monospace fw-bold px-2 py-1 rounded border d-block mt-1 text-body">
                  {selectedServer.tunnel_ip || '—'}
                </span>
              </Col>

              <Col md={12} className="mt-3">
                <span className="text-secondary small d-block">Public Key</span>
                <div className="d-flex align-items-center gap-2 mt-1">
                  <span className="font-monospace small p-2 rounded border text-body flex-grow-1 select-all text-break">
                    {selectedServer.wg_public_key || '—'}
                  </span>
                  {selectedServer.wg_public_key && (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(selectedServer.wg_public_key, {
                          success: 'Public Key copied to clipboard!',
                          error: 'Failed to copy Public Key',
                        })
                      }
                    >
                      Copy
                    </Button>
                  )}
                </div>
              </Col>
            </Row>

            <div className="pt-3 mt-4">
              <Row className="g-2 text-muted small font-monospace">
                <Col sm={6}>
                  <span className="fw-semibold text-secondary">Created:</span>{' '}
                  {formatDate(selectedServer.created_at)}
                </Col>
                <Col sm={6} className="text-sm-end">
                  <span className="fw-semibold text-secondary">Last Updated:</span>{' '}
                  {formatDate(selectedServer.updated_at || selectedServer.created_at)}
                </Col>
              </Row>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseDetails} className="fw-bold px-4">
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </Container>
  );
};

export default VpnServerList;
