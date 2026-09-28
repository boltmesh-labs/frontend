# Security Policy

BoltMesh is a multi-region VPN platform composed of a FastAPI backend, a React/Vite web dashboard, a Go node agent that runs on WireGuard server nodes, and Terraform-provisioned AWS infrastructure. This document describes the security controls implemented across these components and how to report vulnerabilities.

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| 0.x     | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues, pull requests, discussions, or bug-report templates.**

Use **GitHub Private Vulnerability Reporting** instead:

1. Open the [Security tab](https://github.com/boltmesh-labs/vpn-core/security) of this repository.
2. Select **Report a vulnerability**.
3. Fill in the advisory draft. Only repository maintainers can see it until disclosure is coordinated with you.

Please include:

- Description of the vulnerability and the affected component
- Version tag or commit SHA where the issue was observed
- Steps to reproduce, or a proof of concept (if applicable)
- Potential impact
- A suggested fix, if you have one

**Safe harbor**: we will not pursue, or support action against, anyone researching this project in good faith, provided they respect user privacy, avoid service degradation, neither exfiltrate nor destroy data, and use the channel above rather than exploiting a vulnerability beyond what is needed to demonstrate it.

Non-vulnerability security questions may be raised as public GitHub issues with the `security` label — without including sensitive detail.

## Automated Security Controls

CI runs on every push to `main`/`develop` and every pull request targeting `main`/`develop`, through the single workflow `.github/workflows/default.yml`:

- **Trivy filesystem scanning** (the `security` job): scans the working tree (`scan-type: fs`), skips advisories that have no fix available, and fails the build on any CRITICAL finding. It also evaluates third-party dependencies from `package-lock.json`. `.trivyignore` holds a single entry, `GHSA-qwww-vcr4-c8h2` (a React Router CSRF advisory), whose rationale is recorded inline: the application ships as a static client-side SPA and uses no React Server Components, so the advisory is not reachable. The job prints a table — it does not upload SARIF.
- **Lint, format, tests and bundle verification** (the `validate` job): `npm run lint` (ESLint) and `npm run format:check` (Prettier), then `npm run test` (Vitest), mocked Playwright end-to-end tests on Chromium and mobile Chromium, a production-bundle smoke test, and finally `npm run build` followed by `grep` assertions over `dist/` proving the `VITE_*` values were inlined and that no `%VITE_*%` placeholder survived. Playwright reports and test results are uploaded as artifacts on failure only.
- **Pre-commit hooks** (`.pre-commit-config.yaml`, installed locally with `pre-commit install`): ESLint, Prettier, markdownlint, `actionlint` on the GitHub Actions workflows, `gitleaks` for committed secrets, and the standard hygiene guards (trailing whitespace, end-of-file, YAML syntax, large added files, merge/case conflicts, mixed line endings, missing shebangs). The `pre-commit` job runs the tool-free hooks including markdownlint; `validate` runs the skipped ESLint and Prettier hooks through the locked `npm run` scripts, so neither set is local-only.
- **Coverage**: Vitest v8 thresholds of 80% lines and branches are configured for `src/api/**`, `src/hooks/**`, `src/utils/**` and globally, but CI runs `npm run test` without coverage, so they only apply to a local `npm run test:coverage`.
- **CI secret hygiene**: the workflow declares a least-privilege `permissions:` block (`contents: read`, `pull-requests: write`, `security-events: write`, `id-token: write`). The ECR build-and-push job is commented out pending the deployment pipeline, so no AWS credentials are referenced from CI at all.
- **Terraform/IaC scanning** (Checkov) runs in the `infra` repository, not here.

Note: automated dependency-update automation (e.g., Dependabot) is **not yet configured** in this repository. Updates land through normal review, gated by the Trivy scan above.

## Rate Limiting & Abuse Prevention

Two independent layers protect the platform:

1. **Application tier** — Redis-shared rate-limit buckets (pyrate-limiter, Lua-scripted for cross-replica correctness):

   | Scope                 | Limit       |
   | --------------------- | ----------- |
   | Login / auth attempts | 10 req/min  |
   | Token refresh         | 30 req/min  |
   | Node-agent sync       | 30 req/min  |
   | Admin APIs            | 60 req/min  |
   | Everything else       | 100 req/min |

   Exceeding a bucket returns HTTP 429 (`TooManyRequestsError`).

2. **Edge tier** — AWS WAF v2 Web ACLs (a CloudFront-scoped ACL and a regional ACL attached directly to the ALB) evaluate AWS managed rule groups — `CommonRuleSet`, `KnownBadInputsRuleSet`, and `AmazonIpReputationList` — preceded by an IP rate-based rule that absorbs volumetric floods before the managed rules run. The threshold (requests per IP per 5-minute window) is configurable per environment.

## Cryptography & Data Protection

- **Password hashing**: bcrypt, cost factor 12 (see above).
- **TLS everywhere**: ALB HTTPS listeners enforce `ELBSecurityPolicy-TLS13-1-2-2021-06`; CloudFront requires TLS ≥ 1.2 with redirect-to-HTTPS viewer policies; CloudFront→ALB origin connections are HTTPS-only; plain HTTP is redirected at every layer.
- **Gateway TLS**: the Lightning (CLN REST) gateway verifies its peer certificate against `LIGHTNING_CA_CERT`; insecure mode exists (`LIGHTNING_TLS_INSECURE`) but defaults to false.
- **Secrets management**: development secrets live only in local environment variables (never committed); production secrets reside in AWS Secrets Manager under customer-managed KMS keys and are injected directly into ECS task definitions. VPN nodes hold no shared secret: EC2 nodes authenticate with their hypervisor-signed instance identity, and manual nodes hold only their own per-server bootstrap secret (hashed server-side). Terraform receives sensitive values via `TF_VAR_*` rather than plaintext tfvars (values still reach the remote state — the caveat is documented in [infra/README.md](infra/README.md)); the RDS master password uses the RDS-managed Secrets Manager secret and never touches state.
- **Backups and logs at rest**: RDS automated backups retain between 1 and 35 days (validated by configuration constraints); VPC flow logs, ALB access logs, and Terraform state are encrypted with dedicated customer-managed KMS keys.

## Infrastructure Security

- **Network segmentation**: VPC public/private subnets with least-privilege security groups isolating the public ALB, WireGuard EC2 nodes, application containers, ARQ workers, ElastiCache, and database subnets.
- **No SSH**: there are no port 22 ingress rules and no interactive shell path on EC2 nodes — immutable golden AMIs are replaced, not logged into — and IMDSv2 is required.
- **Stateless serving tiers**: frontend and backend run on ECS Fargate; private egress to AWS services (ECR, S3, Secrets Manager, CloudWatch) travels over VPC endpoints instead of NAT gateways.
- **Audit trails**: CloudTrail records governance events to a compliance S3 bucket; VPC flow logs and ALB access logs land in KMS-encrypted S3; CloudWatch log groups use customer-managed CMKs.
- **Edge origin isolation** (when CloudFront fronts the stack): the ALB security group accepts traffic only from the CloudFront origin-facing managed prefix list, and every origin request must carry the shared `X-Origin-Verify` secret header — ALB listener rules return 403 otherwise, preventing direct-to-origin bypass.
- **Hardened node images**: WireGuard node AMIs are built from Packer golden images, with post-deployment checklists covering IMDSv2, no SSH ingress, and security-group review.

## HTTP Security Headers

The production frontend container sets the following headers on all document and asset responses:

X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()

Known gap: the API tier does not currently emit `Strict-Transport-Security` or `Content-Security-Policy` headers. Operators fronting the API with their own CDN or reverse proxy should set them at the edge; adding them in-tree is planned work.

## Response Time

We aim to acknowledge every vulnerability report within **48 hours** and will keep reporters updated throughout triage and remediation. Thank you for your patience.

## Disclosure Policy

1. We acknowledge receipt of your vulnerability report.
2. We investigate and determine the severity.
3. We develop and test a fix.
4. We release a patched version.
5. We publicly disclose the vulnerability after a reasonable delay (typically 90 days), crediting the reporter where desired.

## Best Practices for Operators

If you deploy BoltMesh components, please:

1. **Run supported versions** — update promptly when patch releases ship.
2. **Verify node-agent downloads** — obtain binaries only from official GitHub Releases and confirm `sha256sum -c checksums.txt`.
3. **Protect signing secrets** — `SECRET_KEY`, `REFRESH_SECRET_KEY`, and `NODE_SECRET_KEY` must be distinct, strong random values (minimum 32 characters each). Pin your AWS IID trust (`AWS_IID_ACCOUNT_ID` plus `AWS_IID_SIGNER_FINGERPRINTS`) before enrolling EC2 nodes, and re-issue a server's per-server bootstrap secret (`POST /servers/{id}/bootstrap-secret`) if its one-liner may have leaked.
4. **Keep gateway TLS verification on** — do not set `LIGHTNING_TLS_INSECURE=true` outside throwaway development environments.
5. **Configure proxies honestly** — enable `TRUST_PROXY_HEADERS=true` only behind a reverse proxy you control that sets `X-Forwarded-For`; otherwise rate limiting keys off direct connections.
6. **Pin your origins** — point `CORS_ALLOW_ORIGINS` at exactly your deployed origins; firewall administrative endpoints away from the public internet where possible.
7. **Isolate development crypto services** — the regtest bitcoind, lightningd, monerod, and monero-wallet-rpc containers in docker-compose exist for local development only and must never be reachable from untrusted networks.
8. **Monitor** — scrape the `/health` endpoint (which reports Redis, database, and payment-gateway status) and alert on structured JSON logs.
9. **Back up and rehearse** — configure an appropriate `db_backup_retention` value and periodically test restores.
10. **Review CI changes as security-sensitive code** — audit modifications to `.github/workflows/` and `.trivyignore` with the same scrutiny as source changes.

## Contact

Security-related questions that are **not** vulnerability reports may be raised as public GitHub issues with the `security` label, or discussed privately via a drafted advisory on the [Security tab](https://github.com/boltmesh-labs/vpn-core/security).

Thank you for helping keep BoltMesh and our users safe! 🔒
