export const adminKeys = {
  all: ['admin'],
  // List factories: when called without params they return the bare scope key so
  // React Query prefix matching covers every list (with params) AND detail query,
  // e.g. adminKeys.users() -> ['admin', 'users'] matches
  // ['admin', 'users', {...}] and ['admin', 'users', 'detail', id].
  users: (params) => [...adminKeys.all, 'users', ...(params !== undefined ? [params] : [])],
  userDetail: (id) => [...adminKeys.all, 'users', 'detail', id],
  vpnServers: (params) => [
    ...adminKeys.all,
    'vpn-servers',
    ...(params !== undefined ? [params] : []),
  ],
  vpnServerDetail: (id) => [...adminKeys.all, 'vpn-servers', 'detail', id],
  vpnDevices: (params) => [
    ...adminKeys.all,
    'vpn-devices',
    ...(params !== undefined ? [params] : []),
  ],
  vpnDeviceDetail: (id) => [...adminKeys.all, 'vpn-devices', 'detail', id],
  vpnRegions: (params) => [
    ...adminKeys.all,
    'vpn-regions',
    ...(params !== undefined ? [params] : []),
  ],
  vpnRegionDetail: (id) => [...adminKeys.all, 'vpn-regions', 'detail', id],
  vpnPeers: (params) => [...adminKeys.all, 'vpn-peers', ...(params !== undefined ? [params] : [])],
  vpnPeerDetail: (id) => [...adminKeys.all, 'vpn-peers', 'detail', id],
  vpnNodeAudit: (params) => [
    ...adminKeys.all,
    'node-registration-logs',
    ...(params !== undefined ? [params] : []),
  ],
  plans: (params) => [...adminKeys.all, 'plans', ...(params !== undefined ? [params] : [])],
  planDetail: (id) => [...adminKeys.all, 'plans', 'detail', id],
  subscriptions: (params) => [
    ...adminKeys.all,
    'subscriptions',
    ...(params !== undefined ? [params] : []),
  ],
  subscriptionDetail: (id) => [...adminKeys.all, 'subscriptions', 'detail', id],
  invoices: (params) => [...adminKeys.all, 'invoices', ...(params !== undefined ? [params] : [])],
  invoiceDetail: (id) => [...adminKeys.all, 'invoices', 'detail', id],
  payments: (params) => [...adminKeys.all, 'payments', ...(params !== undefined ? [params] : [])],
  paymentDetail: (id) => [...adminKeys.all, 'payments', 'detail', id],
  subscriptionDevices: (subId) => [...adminKeys.all, 'subscriptions', 'devices', subId],
  subscriptionInvoices: (subId) => [...adminKeys.all, 'subscriptions', 'invoices', subId],
  userDevices: (userId) => [...adminKeys.all, 'users', 'devices', userId],
  userSubscriptions: (userId) => [...adminKeys.all, 'users', 'subscriptions', userId],
  userInvoices: (userId) => [...adminKeys.all, 'users', 'invoices', userId],
};
