# BoltMesh VPN Frontend

React/Vite frontend for the BoltMesh VPN dashboard and administration portal.

## Quick start

Requirements:

- Node.js `>=24`
- npm

```bash
npm ci
cp .env.example .env
npm run dev
```

The Vite development server runs on `http://localhost:5173` by default. Configure `VITE_API_URL` to point at the API version endpoint, for example `http://localhost:8000/v1`.

## Commands

| Command                          | Purpose                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| `npm run dev`                    | Start the Vite development server                                  |
| `npm run build`                  | Create the production bundle in `dist/`                            |
| `npm run preview`                | Serve the production bundle locally                                |
| `npm test`                       | Run the Vitest test suite                                          |
| `npm run test:coverage`          | Run tests with V8 coverage                                         |
| `npm run test:e2e`               | Run all Playwright browser tests                                   |
| `npm run test:e2e:mocked`        | Run mocked desktop/mobile E2E tests                                |
| `npm run test:e2e:live`          | Run the opt-in read-only real-backend E2E tests                    |
| `npm run test:e2e:live:write`    | Run the guarded real-backend write tests                           |
| `npm run test:e2e:production`    | Build and smoke-test the production app                            |
| `npm run test:e2e:cross-browser` | Run mocked tests on Chromium, Firefox, WebKit, and mobile Chromium |
| `npm run test:e2e:ui`            | Open the Playwright test UI                                        |
| `npm run test:e2e:headed`        | Run browser tests in headed mode                                   |
| `podman compose up`              | Run the unit and mocked browser tiers in containers                |
| `npm run lint`                   | Run ESLint                                                         |
| `npm run format:check`           | Check Prettier formatting                                          |
| `npm run format`                 | Format source and configuration files                              |

## Environment

The application reads these public Vite variables:

| Variable                 | Description                                  |
| ------------------------ | -------------------------------------------- |
| `VITE_API_URL`           | API base URL, including the API version path |
| `VITE_APP_COMPANY_NAME`  | Product name shown in the UI and metadata    |
| `VITE_APP_SUPPORT_EMAIL` | Support contact address                      |

Never place secrets in `VITE_*` variables. They are embedded in the browser bundle. Production builds require a valid HTTPS `VITE_API_URL`.

## Project structure

```text
src/
├── api/                 Axios clients and API behavior
├── components/          Shared UI components
├── constants/            Roles, statuses, and table definitions
├── features/             Feature-based pages, hooks, and layouts
├── hooks/                Shared React hooks
├── layouts/              Application layouts
├── styles/               Global styles
├── test/                 Shared test setup
└── utils/                Formatting, configuration, and API utilities
```

Feature code is organized by domain. Admin functionality lives under `src/features/admin`, while customer-facing functionality lives under `src/features/dashboard`.

## Authentication and API behavior

- Access tokens are kept in memory.
- Refresh credentials are handled by the backend through secure cookies.
- Axios requests use the configured API base URL and credentialed requests.
- A failed access token triggers one refresh attempt; failed sessions are cleared.
- OAuth callback destinations are restricted to same-app absolute paths.

The frontend does not replace server-side authorization. Role checks improve navigation and UX, while the API remains responsible for enforcing permissions.

## Testing

Tests are colocated with source files and run with Vitest and Testing Library. The test setup includes DOM cleanup, storage isolation, and browser API mocks.

```bash
npm test
npm run test:coverage
```

End-to-end tests use Playwright and live in `e2e/`. They start the Vite development server automatically and cover public routes, protected-route redirects, the 404 page, mocked sign-in/sign-out flows, access-token refresh and replay, registration and password reset, the email-token account lifecycle (activation and deletion), the OAuth callback and its open-redirect guard, the mocked plan-to-invoice checkout flow, the payment page's status/expiry/clipboard states, user and admin management flows, the shared admin list controls (debounced search, filters, pagination), and a dedicated mobile Chromium project. Shared fixtures provide guest, user, and admin states, centralized API/data mocks, strict endpoint and method assertions, and uncaught page-error detection. The refresh-token request is mocked by default so these tests do not require a running API. API mocks match `/v1` by default; set `E2E_API_URL` when the test API uses a different host or base path.

Three fixture rules are worth knowing before adding a spec:

- **Every endpoint a page loads needs a mock.** An unmocked request that reaches a real API comes back 401, which the client reads as an expired session and turns into a logout mid-test — a failure that points at the wrong thing entirely. The `page` fixture records any request no mock claimed and fails the test listing them, so a missing mock says which endpoint it is. That includes endpoints a page only uses to decorate rows, such as the admin invoice list's join to `/admin/plans`.
- **Authenticated tests navigate by clicking the app's own links**, not with `page.goto()`. A full page load restarts the SPA and re-runs the silent boot refresh, which bounces a signed-in session back to `/login`. `e2e/fixtures/navigation.js` wraps the common admin and dashboard routes; `allowSessionReload()` in `fixtures/auth.js` opts a test into deep links when there is no other way in.
- **Overlapping mocks resolve last-registered-first**, so register defaults before the ones a test cares about. A mock only claims the verb it declares and hands anything else back to the next handler, so a `PATCH /users` mock does not shadow the `GET /users` the same page makes.

`mockJson` serves one fixed response; `mockSequence` serves a per-call sequence and returns a handle exposing `calls` and `queries`, which is how the session, payment and list specs assert what the _app_ decided (one refresh, one replay, the exact query string) rather than only what the stub returned.

```bash
npm run test:e2e:mocked
npm run test:e2e:production
npm run test:e2e:cross-browser
npm run test:e2e:ui
```

The mocked suite uses the Vite development server. The live command automatically loads `.env.e2e` when it exists. With `E2E_BASE_URL` set, Playwright tests the already-running frontend at that URL and does not start Vite. The deployed frontend must already target the production API; `E2E_API_URL` records that expected API for the test configuration but does not rebuild or reconfigure the deployed bundle. In this mode, `VITE_API_URL` is not needed. The production smoke command builds the app and serves it through `vite preview`. Cross-browser coverage runs on a schedule and requires Chromium, Firefox, and WebKit:

```bash
npx playwright install --with-deps chromium firefox webkit
```

The main CI job runs mocked tests with two workers against an explicit API URL. The live suite is opt-in and runs separately with one worker when a seeded backend is available.

An opt-in real-backend test is available when a seeded test account and API are available:

```bash
E2E_LIVE=1 \
E2E_USERNAME=e2e-user \
E2E_PASSWORD='E2ePassword123' \
E2E_ADMIN_USERNAME=e2e-admin \
E2E_ADMIN_PASSWORD='E2eAdminPassword123' \
E2E_BASE_URL=https://boltmesh.mooo.com \
E2E_API_URL=https://api.boltmesh.mooo.com/v1 \
npm run test:e2e:live
```

The live suite verifies invalid-credential handling, login, refresh-cookie session restoration and logout revocation, backend-enforced admin authorization, authenticated user and admin list/detail pages, real 404 error states, deployed metadata, and browser credential-storage/cookie security. Detail coverage dynamically uses the first available record of each type and records a coverage annotation when the backend has none. It is run manually rather than in GitHub Actions because it requires seeded users and a compatible real backend.

```bash
E2E_ALLOW_WRITES=1 \
E2E_WRITE_ENVIRONMENT=local \
E2E_BASE_URL=http://127.0.0.1:5173 \
E2E_API_URL=http://127.0.0.1:8000/v1 \
npm run test:e2e:live:write
```

Never point the write suite at production. Backend strict endpoints share a small per-minute request
budget, so the suite reserves that budget instead of throttling its own cleanup operations.

### Running the suites in containers

The same tiers run in containers via `Dockerfile.playwright` and `compose.yaml`, so a failure reproduces
against the same browser builds CI uses instead of whatever is installed locally. `Dockerfile.playwright`
pins its Playwright image tag to the `@playwright/test` version in `package.json`; bump both together, or
the container fails looking for browser builds the runner expects but the image does not have.

```bash
podman compose build
podman compose run --rm e2e-mocked    # one tier
podman compose up                     # unit, mocked, cross-browser, production
```

Reports, traces, and screenshots land in `./artifacts/<tier>/`, gitignored. Each tier writes its own
subdirectory because `up` runs them in parallel. Two things to know when driving it: `podman compose run`
takes a single service (naming several passes the extras as arguments to the first, not as services to
run), and plain `up` exits 0 whether or not the tests passed, so read the output rather than the exit code.

The live tiers need real credentials and network access to a deployed environment, so they sit behind
profiles and stay out of a plain `up`. `--env-file` must come before the subcommand, and the live specs
skip rather than fail when it is absent, so an unconfigured run cannot be mistaken for a pass:

```bash
podman compose --env-file .env.e2e --profile live run --rm e2e-live
podman compose --env-file .env.e2e --profile writes run --rm e2e-live-write
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for production builds, SPA routing, caching, security headers, smoke tests, and rollback guidance.
