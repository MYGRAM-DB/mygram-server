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

Public repository reads may work without a token, but GitHub API rate limits are lower. For private repositories, use a fine-grained token with repository metadata, Actions, Checks, and Pull requests set to **read-only**. Prefer the Actions-provided `GITHUB_TOKEN` in CI.

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
