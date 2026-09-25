# AGENTS.md

BoltMesh VPN: React/Vite frontend in plain JS.

## Commands

- **Frontend**: `npm run lint`, `npm run format` (CI checks with `format:check`), `npm test` (vitest, `src/**/*.test.{js,jsx}`), `npm run build`. Single alias `@` → `src/`, env vars must be `VITE_*`. No dev proxy — calls `VITE_API_URL`.

## Conventions & gotchas

- **Pre-commit** (`.pre-commit-config.yaml`): eslint, prettier, markdownlint.
- Do not implement backward compatibility, there is no production servers yet.
- Try to not overengineer, keep it lean, guard only real edge cases, no redundant checks.
- Other boltmesh repos live in parent directory (backend, frontend, agent, client, infra)
