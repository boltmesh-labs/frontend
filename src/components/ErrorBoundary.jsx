import React from 'react';
import { Button, Card, Container } from 'react-bootstrap';

const CHUNK_RETRY_KEY = 'chunk_retry_reload';

// One automatic reload per cooldown window: enough to recover from a stale
// chunk after a deploy, while still capping reload loops. Timestamp-based so a
// SECOND later stale-chunk crash (e.g. after another deploy) also auto-recovers
// instead of dead-ending in the fallback UI until a manual reset.
const CHUNK_RETRY_COOLDOWN_MS = 30000;

const isChunkLoadError = (error) =>
  error?.name === 'ChunkLoadError' ||
  // Vite's message when a hashed chunk 404s after a deploy. Deliberately NOT
  // the broader /failed to fetch/i: that also matches ordinary network
  // failures, and auto-reloading for those punishes flaky connections.
  /failed to fetch dynamically imported module/i.test(error?.message);

const handleChunkError = () => {
  const lastReloadAt = Number(sessionStorage.getItem(CHUNK_RETRY_KEY) || 0);
  if (!lastReloadAt || Date.now() - lastReloadAt > CHUNK_RETRY_COOLDOWN_MS) {
    sessionStorage.setItem(CHUNK_RETRY_KEY, String(Date.now()));
    console.warn('Chunk mismatch detected. Refreshing application...');
    window.location.reload();
  }
};

const handleManualReset = () => {
  sessionStorage.removeItem(CHUNK_RETRY_KEY);
  window.location.href = '/';
};

const ErrorFallback = ({ resetErrorBoundary }) => {
  // Logging and chunk-error recovery live solely in ErrorBoundary's
  // componentDidCatch (which also receives errorInfo); this fallback only
  // renders the UI.
  return (
    <Container className="d-flex align-items-center justify-content-center min-vh-100 py-5">
      <Card
        className="p-4 shadow-sm border-0 text-center bg-body-tertiary w-100"
        style={{ maxWidth: '500px' }}
      >
        <Card.Body>
          <div className="mb-3" style={{ fontSize: '2.5rem' }} role="img" aria-label="Gear">
            ⚙️
          </div>
          <h3 className="fw-bold mb-2">Operation Halted</h3>
          <p className="text-muted small mb-4">
            Something went wrong while loading this page. This could be due to a recent network
            update or a stale session.
          </p>
          <Button
            variant="primary"
            onClick={resetErrorBoundary ?? handleManualReset}
            className="w-100 fw-bold py-2 shadow-sm"
          >
            Reload Operational Console
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught a runtime crash:', error, errorInfo);
    if (isChunkLoadError(error)) {
      handleChunkError();
    }
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback error={this.state.error} resetErrorBoundary={this.resetErrorBoundary} />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
