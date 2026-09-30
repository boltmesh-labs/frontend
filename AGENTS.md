# AGENTS.md

BoltMesh VPN: React/Vite frontend in plain JS.

## Commands

- **Frontend**: `npm run lint`, `npm run format` (CI checks with `format:check`), `npm test` (vitest, `src/**/*.test.{js,jsx}`), `npm run build`. Single alias `@` → `src/`, env vars must be `VITE_*`. No dev proxy — calls `VITE_API_URL`.

## Conventions & gotchas

- **Pre-commit** (`.pre-commit-config.yaml`): eslint, prettier, markdownlint, `actionlint` on the workflows, `gitleaks` for committed secrets, plus the standard hygiene guards (whitespace, EOF, YAML, large files, merge/case conflicts, line endings, shebangs). These are a local gate and are not re-checked in CI. `validate` runs ESLint and Prettier through the locked `npm run lint` / `npm run format:check`, since both resolve the local devDependencies, and `security` runs `gitleaks` over the full commit history (`fetch-depth: 0`); `actionlint`, the hygiene guards and markdownlint are covered by running the hooks locally with `--all-files`. markdownlint is `language: node` with its version pinned in `additional_dependencies`, so pre-commit installs its tree once into `~/.cache/pre-commit` rather than re-resolving ~80 packages into an uncached `~/.npm/_npx` on every run, and it stays out of this repo's lockfile and the `format:check` chain. Prettier is configured identically in every boltmesh repo: `.prettierrc.json` is byte-for-byte the same file in all five, `.prettierignore` opens with the same vendored/generated block, and the version is pinned. Because the file is shared, changing an option value reformats every repo at once, so land such a change as its own commit across all five rather than in one. This repo is the only one where markdown is also prettier's job (via the `format` scripts), and the only one with a `package.json`, so its pin lives there and in the lockfile rather than in the hook entry.
- Do not implement backward compatibility, there is no production servers yet.
- Try to not overengineer, keep it lean, guard only real edge cases, no redundant checks.
- Other boltmesh repos live in parent directory (backend, frontend, agent, client, infra)
