# Contributing to BoltMesh

First off, thank you for considering contributing to BoltMesh! It's people like you that make BoltMesh such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

> **Found a security vulnerability?** Please do **not** open a bug report, issue, or PR for it — follow [SECURITY.md](SECURITY.md) to submit a private vulnerability advisory instead.

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps which reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed after following the steps**
- **Explain which behavior you expected to see instead and why**
- **Include screenshots/logs if possible**
- **Include your environment details** (OS, Node version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Provide specific examples to demonstrate the steps**
- **Describe the current behavior and expected behavior**
- **Explain why this enhancement would be useful**

### Pull Requests

- Fill in the required template
- Follow the project's style guides (ESLint/Prettier for JavaScript)
- Include appropriate test cases
- Update documentation as needed (README.md, DEPLOYMENT.md)
- End all files with a newline

## Local Hooks

Install the git hook once after cloning. It runs the checks CI does not, so a
violation is caught before you push:

```bash
npm ci                         # the eslint/prettier hooks use the local install
pre-commit install
pre-commit run --all-files     # optional: the whole tree, not just staged files
```

The ESLint and Prettier hooks resolve the local devDependencies, so they need
that install. To run everything else, skip them by id:

```bash
SKIP=eslint,prettier pre-commit run --all-files
```

## Style Guides

### JavaScript/React Style Guide

The frontend uses ESLint and Prettier:

```bash
npm run lint
npm run format
```

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

Example:

```text
Add peer cleanup on subscription expiry

- Deactivate peers for expired subscriptions
- Reconcile active peer counts on VPN servers

Fixes #123
```

## Testing

### Running Tests

```bash
npm test
```

### Running Tests in Containers

Every tier also runs against the browser builds CI uses, via `compose.yaml`:

```bash
podman compose build
podman compose run --rm e2e-mocked    # one tier
podman compose up                     # unit, mocked, cross-browser, production
```

Use this when a failure may depend on the local environment rather than on the code. Reports and failure
artifacts land in `./artifacts/<tier>/`. The live tiers live behind `--profile live`, `--profile local`, and
`--profile writes`, so they never run as part of `up`; the `local` profile additionally needs the infra
stack running and port 5173 free. See the README for details and for the version pin between
`Dockerfile.playwright` and `@playwright/test`.

### Writing Tests

- Write tests for all new features
- Aim for >80% code coverage
- Use descriptive test names

### Test Locations

Frontend tests are colocated under `frontend/src/` and run with Vitest:

```text
src/components/
├── Button.jsx
└── Button.test.jsx
```

## Documentation

- Update README.md if you change functionality
- Update DEPLOYMENT.md if you change deployment procedures

## Issue and Pull Request Labels

This section lists the labels we use to help track and manage issues and pull requests.

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements or additions to documentation
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `question` - Further information is requested
- `security` - Security-related issue
- `performance` - Performance improvement

## Additional Notes

### Issue and Pull Request Process

1. After you submit your pull request, verify that all status checks are passing
2. If a status check is failing, and you believe that the failure is unrelated to your change, please leave a comment on the pull request explaining why you believe the failure is unrelated
3. A project maintainer will review your code and may request changes or improvements
4. Once approved, your code will be merged into the main branch

### Community

- Use discussions for feature ideas
- Join our Discord community (link TBD)
- Follow us on Twitter for updates

## Questions?

Feel free to contact the maintainers:

- 📧 Email: `9992383+regularnmae@users.noreply.github.com`
- 💬 GitHub Discussions: [Link]

Thank you for contributing! 🎉
