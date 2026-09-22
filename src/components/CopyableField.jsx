import { useCallback } from 'react';
import { Button } from 'react-bootstrap';
import { copyToClipboard } from '@/utils/clipboard';
import { useCopied } from '@/hooks/useCopied';

/**
 * Reusable field for displaying monospaced copyable text (keys, addresses, URIs, tokens).
 */
export const CopyableField = ({
  label,
  value,
  toastLabel = label,
  className = '',
  sensitive = false,
  truncate = false,
  title,
}) => {
  // Timer bookkeeping (unmount cleanup, stacked-click collapse) lives in
  // useCopied so every copy UI in the app shares one implementation.
  const { copied, markCopied } = useCopied();

  const handleCopy = useCallback(async () => {
    if (!value) return;

    const didCopy = await copyToClipboard(value, {
      success: `${toastLabel} copied to clipboard!`,
      error: `Failed to copy ${toastLabel.toLowerCase()}.`,
    });
    if (didCopy) markCopied();
  }, [value, toastLabel, markCopied]);

  if (!value) return null;

  const displayValue = sensitive ? '••••••••••••••••••••••••••••••••••••••••••••' : value;

  const overflowClass = truncate ? 'text-truncate' : 'text-break';

  return (
    <div className={className}>
      {label && (
        <span className="text-muted small fw-bold d-block mb-1 text-uppercase font-monospace">
          {label}
        </span>
      )}
      <div className="d-flex align-items-stretch justify-content-between gap-2">
        <span
          className={`font-monospace text-body ${overflowClass} small bg-body-tertiary p-2 rounded border flex-grow-1 user-select-all h-100 d-flex align-items-center`}
          title={title || (truncate ? value : undefined)}
        >
          {displayValue}
        </span>
        <Button
          variant={copied ? 'outline-success' : 'outline-primary'}
          size="sm"
          className="fw-bold rounded-3 flex-shrink-0 px-3 h-100 d-flex align-items-center justify-content-center"
          onClick={handleCopy}
          disabled={copied}
          aria-label={`Copy ${label || toastLabel}`}
        >
          Copy
        </Button>
      </div>
    </div>
  );
};
