import { Card } from "react-bootstrap";

import { CopyableField } from "@/components/CopyableField";

/**
 * Shown once, right after a create: the command embeds the server's bootstrap
 * secret and the backend never returns it again.
 */
export const BootstrapCommandCard = ({ command }) => {
  if (!command) return null;

  return (
    <Card className="border-0 shadow-sm mt-4 p-4">
      <h5 className="fw-bold text-body mb-2">Bootstrap Command</h5>
      <p className="text-secondary mb-3">
        Run this command on the new VPN server to install and connect the server
        agent.
      </p>
      <CopyableField
        label="VpnServer Bootstrap Command"
        value={command}
        toastLabel="Bootstrap command"
      />
      <p className="text-warning small mb-0 mt-3">
        Keep this command private: it embeds the server bootstrap secret and
        will not be shown again.
      </p>
    </Card>
  );
};
