# MYGRAM DevPilot v0.1

Read-only GitHub CI monitor for MYGRAM. The first version reports branch checks, recent workflow runs, and open pull requests. It does not modify repositories.

## Requirements
- GitHub Actions for scheduled operation
- Node.js 20 or newer for local development

## Local Windows development
1. Install Node.js 20+.
2. Open PowerShell in this directory.
3. Run `npm test` and `npm run check`.
4. Copy `.env.example` to `.env` only if local authenticated requests are needed.
5. Never commit `.env` or a real token.

The monitored MYGRAM app repository is public, so CI intentionally makes unauthenticated read-only requests. The current polling interval is designed to stay below typical unauthenticated REST rate limits. If the target repository becomes private or the rate limit is exceeded, configure a fine-grained token as a GitHub Actions secret with read-only access to the target repository. Never put a real token in this file or in source control.

## GitHub Actions
The workflow runs on a 15-minute schedule and on manual dispatch. GitHub scheduled workflows can start late during load. The workflow requires read-only permissions and uploads JSON/Markdown reports as artifacts, not as repository commits.

GitHub requires a scheduled workflow to be present on the default branch before its schedule becomes active. Review the DevPilot pull request before merging anything. No merge is performed by DevPilot.

## Configuration
- `GITHUB_OWNER`: defaults to `MYGRAM-DB`
- `GITHUB_REPO`: defaults to `mygram-server`
- `GITHUB_BRANCH`: defaults to `devpilot/bootstrap`
- `REPORT_DIR`: local output directory, defaults to `reports`

## Safety
No write API methods are implemented. No Supabase credentials are used. No deploy job exists. No auto-merge exists. The monitor does not execute code from the monitored repository.
