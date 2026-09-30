# BoltMesh Frontend Deployment

This document describes how to build and deploy the BoltMesh React/Vite frontend. The frontend is a static SPA and requires a web server or CDN capable of serving `index.html` for unknown paths.

## Prerequisites

- Node.js `>=24`
- npm
- A configured BoltMesh API and OAuth callback URLs
- A static host/CDN with SPA fallback support

## Environment variables

Create a production environment file from `.env.example`:

```bash
cp .env.example .env.production
```

Set these values before building:

| Variable                 | Required | Description                                                                            |
| ------------------------ | -------- | -------------------------------------------------------------------------------------- |
| `VITE_API_URL`           | Yes      | API base URL, including the API version path, for example `https://api.example.com/v1` |
| `VITE_APP_COMPANY_NAME`  | Yes      | Product name shown in the UI and page metadata                                         |
| `VITE_APP_SUPPORT_EMAIL` | Yes      | Support contact address                                                                |

`VITE_API_URL` must be an absolute URL. Production builds reject missing, malformed, and non-HTTPS API URLs rather than silently falling back to localhost.

Vite embeds `VITE_*` variables into the client bundle at build time. Never put secrets in these variables; browser-delivered values are public.

## Build

```bash
npm ci
npm run lint
npm run format:check
npm test
npm run build
```

The deployable output is `dist/`.

## Container image

`Dockerfile` has three stages. `prod` is the default and is what any public deployment should run: it compiles the bundle and serves it from nginx using `deploy/nginx.conf`, which already sets the SPA fallback, the cache policy and the security headers below.

```bash
podman build --target prod \
  --build-arg VITE_API_URL=https://api.example.com/v1 \
  --build-arg VITE_APP_COMPANY_NAME="Example" \
  --build-arg VITE_APP_SUPPORT_EMAIL=support@example.org \
  -t frontend:prod .
```

The `VITE_*` build arguments are required. `src/utils/config.js` throws at runtime, not at build time, when `VITE_API_URL` is missing or non-HTTPS, so a build that omits them produces an image that fails only once a visitor loads it. Confirm what was baked in before deploying:

```bash
podman run --rm --entrypoint grep frontend:prod \
  -rl 'api\.example\.com' /usr/share/nginx/html/assets
```

The `dev` stage is the Vite dev server with the source tree mounted. It is for local development only — see the `dev` compose profile in [infra/DEPLOYMENT.md](../infra/DEPLOYMENT.md).

## Web server configuration

Serve `dist/` as the document root and configure all unknown non-asset paths to return `index.html`. This is required for direct navigation to routes such as:

- `/dashboard`
- `/invoices/123`
- `/admin/vpn-servers/42`

Do not apply the SPA fallback to missing files under `/assets/`; those should return a normal `404` so stale or mistyped bundle requests are visible.

### Cache policy

Recommended caching:

```text
/index.html                 Cache-Control: no-cache
/assets/*                   Cache-Control: public, max-age=31536000, immutable
/favicon.png                Cache-Control: public, max-age=86400
/manifest.json              Cache-Control: public, max-age=3600
```

Use a new `index.html` for every release. Vite-generated asset filenames contain a content hash and are safe to cache long-term.

## Security headers

Configure the static host or reverse proxy to return these headers for HTML and asset responses:

```text
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

Add a Content Security Policy that allows the configured API and OAuth origins. Review the policy with the payment and OAuth flows before enabling `frame-ancestors` or other restrictions in production.

The API and CDN layers must also use HTTPS. The frontend sends refresh cookies with credentialed requests, so the API's CORS and cookie settings must include the exact deployed frontend origin.

The refresh cookie must carry `Secure` on any environment served over HTTPS, including staging. The backend derives that flag from `APP_ENV` and only sets it for `prod`, so a staging deployment serves `refresh_token` without it unless `COOKIE_SECURE=true` is set explicitly in the task-definition environment (`infra/aws/terraform/modules/backend/locals.tf`). The live E2E suite asserts this flag, so the omission shows up there as a failure of `a real session keeps credentials out of browser storage`. Set the variable rather than relaxing the assertion.

## Smoke test after deployment

1. Load `/` and confirm the app redirects to `/login`.
2. Load a protected deep link directly and confirm the session check redirects to login when signed out.
3. Sign in and confirm the dashboard loads.
4. Open an admin route with both an admin and a regular user account.
5. Complete the OAuth flow in a private browsing window.
6. Confirm API requests use the intended HTTPS origin and no access token appears in the URL.
7. Check the browser console and network panel for failed chunks, mixed content, CORS, and cookie errors.

## Rollback

1. Identify the last known-good build artifact.
2. Restore the previous `dist/` contents atomically.
3. Keep the previous hashed assets available until the rollback is complete.
4. Reload a hard refresh and run the smoke tests above.
5. If a stale browser tab reports a chunk-load error, perform one hard refresh; the application also limits automatic stale-chunk reloads.

## Troubleshooting

### API requests go to localhost

The production build was created without a valid `VITE_API_URL`, or the environment variable was not available to the build process. Rebuild after setting the variable.

### Direct links return 404

The static host is not configured for SPA fallback. Configure unknown application paths to return `/index.html`.

### OAuth returns to the login page

Verify the API OAuth callback URL, frontend callback URL, allowed redirect origins, and secure cookie settings. Also check that the browser can make credentialed requests to `VITE_API_URL`.

### Stale JavaScript chunk errors

Check that the release uploaded both `index.html` and the complete new `assets/` directory. Avoid deleting old hashed assets until clients have had time to load the new release.

## See also

- [Contributing guidelines](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Environment example](.env.example)
