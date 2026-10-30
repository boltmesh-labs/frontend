import { mapAwgParamsToForm } from "./awg";

export const DEFAULT_STATUS = "provisioning";
export const DEFAULT_OS = "rocky";

/**
 * Seeds the server form from an API row. Pure so the defaults that only apply
 * on create (the stream port) stay distinguishable from stored values.
 */
export const mapServerToForm = (server, isNew = false) => ({
  name: server?.name || "",
  region_id: server?.region_id || "",
  public_ip: server?.public_ip || "",
  endpoint: server?.endpoint || "",
  tunnel_ip: server?.tunnel_ip || "",
  wg_port: server?.wg_port ?? "",
  awg_enabled: server?.awg_enabled ?? true,
  awg_port: server?.awg_port ?? "",
  awg_tunnel_ip: server?.awg_tunnel_ip ?? "",
  ...mapAwgParamsToForm(server?.awg_params),
  tcp_enabled: server?.tcp_enabled ?? true,
  tcp_port: server?.tcp_port ?? (isNew ? 443 : ""),
  // Read-only display: client DNS is always the tunnel host address
  // (derived server-side), never an editable field.
  wg_public_key: server?.wg_public_key || "",
  os: server?.os || DEFAULT_OS,
  status: server?.status || DEFAULT_STATUS,
  created_at: server?.created_at || null,
  updated_at: server?.updated_at || null,
});
