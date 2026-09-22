// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { adminKeys } from './queryKeys';

describe('adminKeys', () => {
  it('roots the family under [admin]', () => {
    expect(adminKeys.all).toEqual(['admin']);
  });

  it.each([
    ['users', adminKeys.users, 'users', adminKeys.userDetail],
    ['vpnServers', adminKeys.vpnServers, 'vpn-servers', adminKeys.vpnServerDetail],
    ['vpnDevices', adminKeys.vpnDevices, 'vpn-devices', adminKeys.vpnDeviceDetail],
    ['vpnRegions', adminKeys.vpnRegions, 'vpn-regions', adminKeys.vpnRegionDetail],
    ['vpnPeers', adminKeys.vpnPeers, 'vpn-peers', adminKeys.vpnPeerDetail],
    ['plans', adminKeys.plans, 'plans', adminKeys.planDetail],
    ['subscriptions', adminKeys.subscriptions, 'subscriptions', adminKeys.subscriptionDetail],
    ['invoices', adminKeys.invoices, 'invoices', adminKeys.invoiceDetail],
    ['payments', adminKeys.payments, 'payments', adminKeys.paymentDetail],
  ])(
    '%s keys nest list params under the scope key',
    (_name, listFactory, segment, detailFactory) => {
      const bare = listFactory();
      expect(bare).toEqual(['admin', segment]);

      const params = { page: 2 };
      expect(listFactory(params)).toEqual(['admin', segment, params]);

      // The bare list key must prefix-match the detail key so invalidateQueries
      // on the scope covers every detail query too.
      expect(detailFactory('abc')).toEqual(['admin', segment, 'detail', 'abc']);
      expect(bare.slice(0, 2)).toEqual(detailFactory('abc').slice(0, 2));
    }
  );
});
