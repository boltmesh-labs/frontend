# AGENTS.md

BoltMesh VPN: React/Vite frontend in plain JS.

## Commands

- **Frontend**: `npm run lint`, `npm run format` (CI checks with `format:check`), `npm test` (vitest, `src/**/*.test.{js,jsx}`), `npm run build`. Single alias `@` → `src/`, env vars must be `VITE_*`. No dev proxy — calls `VITE_API_URL`.

## Conventions & gotchas

- **Pre-commit** (`.pre-commit-config.yaml`): eslint, prettier, markdownlint, `actionlint` on the workflows, `gitleaks` for committed secrets, plus the standard hygiene guards (whitespace, EOF, YAML, large files, merge/case conflicts, line endings, shebangs). Hooks are local-only here; CI's `validate` job runs the equivalent commands directly. Prettier is configured the same way in every boltmesh repo: a `.prettierrc.json` carrying the same explicit key set, a `.prettierignore` opening with the same vendored/generated block, and a pinned version. Only the option *values* differ, and each repo's match the code already in it -- changing one reformats the whole repo, so land a value change as its own commit. Here that means `singleQuote: true` and `printWidth: 100`, which the rest of the set does not use; the version is pinned in `package.json` and the lockfile rather than in the hook entry, because this is the one repo with a `package.json`.
- Do not implement backward compatibility, there is no production servers yet.
- Try to not overengineer, keep it lean, guard only real edge cases, no redundant checks.
- Other boltmesh repos live in parent directory (backend, frontend, agent, client, infra)
