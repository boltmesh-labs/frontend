import { Button, Spinner } from 'react-bootstrap';

/**
 * Button that renders an inline spinner while `loading` is true and swaps the
 * label for `loadingLabel`. Works with plain loading booleans or React 19
 * `isPending`.
 */
export const AsyncButton = ({ loading = false, loadingLabel, children, disabled, ...rest }) => (
  <Button {...rest} disabled={disabled || loading} aria-busy={loading}>
    {loading && <Spinner animation="border" size="sm" className="me-2" aria-hidden="true" />}
    {loading ? (loadingLabel ?? children) : children}
  </Button>
);
