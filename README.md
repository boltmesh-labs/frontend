# BoltMesh VPN Frontend

React/Vite frontend for the BoltMesh VPN dashboard and administration portal.

## Quick start

Requirements:

- Node.js `>=22`
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
| `npm run test:e2e:live`          | Run the opt-in real-backend E2E tests                              |
| `npm run test:e2e:production`    | Build and smoke-test the production app                            |
| `npm run test:e2e:cross-browser` | Run mocked tests on Chromium, Firefox, WebKit, and mobile Chromium |
| `npm run test:e2e:ui`            | Open the Playwright test UI                                        |
| `npm run test:e2e:headed`        | Run browser tests in headed mode                                   |
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

End-to-end tests use Playwright and live in `e2e/`. They start the Vite development server automatically and cover public routes, protected-route redirects, the 404 page, mocked sign-in/sign-out flows, the mocked plan-to-invoice checkout flow, user and admin management flows, and a dedicated mobile Chromium project. Shared fixtures provide guest, user, and admin states, centralized API/data mocks, strict endpoint and method assertions, and uncaught page-error detection. The refresh-token request is mocked by default so these tests do not require a running API. API mocks match `/v1` by default; set `E2E_API_URL` when the test API uses a different host or base path.

```bash
npm run test:e2e:mocked
npm run test:e2e:production
npm run test:e2e:cross-browser
npm run test:e2e:ui
```

The mocked suite uses the Vite development server. The production smoke command builds the app and serves it through `vite preview`. Cross-browser coverage runs on a schedule and requires Chromium, Firefox, and WebKit:

```bash
npx playwright install --with-deps chromium firefox webkit
```

The main CI job runs mocked tests with two workers against an explicit API URL. The live suite is kept separate so its shared backend state runs with one worker.

An opt-in real-backend test is available when a seeded test account and API are available:

```bash
E2E_LIVE=1 \
E2E_USERNAME=e2e-user \
E2E_PASSWORD='E2ePassword123' \
E2E_ADMIN_USERNAME=e2e-admin \
E2E_ADMIN_PASSWORD='E2eAdminPassword123' \
E2E_API_URL=http://127.0.0.1:8000/v1 \
VITE_API_URL=http://127.0.0.1:8000/v1 \
npm run test:e2e:live
```

The live suite verifies login, refresh-cookie session restoration, logout, and admin authorization. To enable the optional GitHub Actions job, set the repository variable `E2E_LIVE_ENABLED=true` and the secrets `E2E_USER_PASSWORD` and `E2E_ADMIN_PASSWORD`. The job starts PostgreSQL, Redis, migrates and seeds the backend, then runs the live browser tests.

See [DEPLOYMENT.md](DEPLOYMENT.md) for production builds, SPA routing, caching, security headers, smoke tests, and rollback guidance.
