import { describe, expect, it } from "vitest";

import { DEFAULT_OS, DEFAULT_STATUS, mapServerToForm } from "./vpnServerForm";

describe("mapServerToForm", () => {
  it("seeds a blank create form with the rungs on and the stream port prefilled", () => {
    const form = mapServerToForm(undefined, true);

    expect(form.name).toBe("");
    expect(form.region_id).toBe("");
    // Both rungs default on, so a new server ships with every transport.
    expect(form.awg_enabled).toBe(true);
    expect(form.tcp_enabled).toBe(true);
    expect(form.tcp_port).toBe(443);
    expect(form.os).toBe(DEFAULT_OS);
    expect(form.status).toBe(DEFAULT_STATUS);
  });

  it("leaves the stream port blank on edit when the server has none stored", () => {
    // The 443 default is create-only: on edit a blank port means "unchanged",
    // so the backend keeps whatever it has.
    expect(mapServerToForm({}, false).tcp_port).toBe("");
  });

  it("copies stored values over the defaults", () => {
    const form = mapServerToForm({
      name: "Us-East-01",
      region_id: "r1",
      public_ip: "198.51.100.1",
      endpoint: "server-1.example.com",
      tunnel_ip: "10.1.0.1/16",
      wg_port: 51820,
      awg_enabled: false,
      awg_port: 51821,
      awg_tunnel_ip: "10.2.0.1/16",
      tcp_enabled: false,
      tcp_port: 8443,
      os: "ubuntu",
      status: "online",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-02-01T00:00:00Z",
    });

    expect(form).toMatchObject({
      name: "Us-East-01",
      region_id: "r1",
      wg_port: 51820,
      awg_enabled: false,
      awg_port: 51821,
      tcp_enabled: false,
      tcp_port: 8443,
      os: "ubuntu",
      status: "online",
    });
  });

  it("keeps a stored port of 0 instead of treating it as unset", () => {
    expect(mapServerToForm({ wg_port: 0 }).wg_port).toBe(0);
  });

  it("flattens the AWG parameter set into the form fields", () => {
    const form = mapServerToForm({ awg_params: { jc: 5, h2: [7, 8] } });

    expect(form.jc).toBe(5);
    expect(form.h2_lo).toBe(7);
    expect(form.h2_hi).toBe(8);
    // Fields the server does not set stay blank rather than undefined.
    expect(form.jmin).toBe("");
  });
});
