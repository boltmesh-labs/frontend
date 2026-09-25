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

| Command                   | Purpose                                 |
| ------------------------- | --------------------------------------- |
| `npm run dev`             | Start the Vite development server       |
| `npm run build`           | Create the production bundle in `dist/` |
| `npm run preview`         | Serve the production bundle locally     |
| `npm test`                | Run the Vitest test suite               |
| `npm run test:coverage`   | Run tests with V8 coverage              |
| `npm run test:e2e`        | Run the Playwright browser tests        |
| `npm run test:e2e:ui`     | Open the Playwright test UI             |
| `npm run test:e2e:headed` | Run browser tests in headed mode        |
| `npm run lint`            | Run ESLint                              |
| `npm run format:check`    | Check Prettier formatting               |
| `npm run format`          | Format source and configuration files   |

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

End-to-end tests use Playwright and live in `e2e/`. They start the Vite development server automatically and currently cover public routes, protected-route redirects, the 404 page, and mocked sign-in/sign-out flows. The refresh-token request is mocked so these tests do not require a running API.

```bash
npm run test:e2e
npm run test:e2e:ui
```

Install the Chromium browser before running the tests for the first time:

```bash
npx playwright install --with-deps chromium
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for production builds, SPA routing, caching, security headers, smoke tests, and rollback guidance.
