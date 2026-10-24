# Security model

- GitHub Actions permissions are explicitly read-only: repository contents, Actions, Checks, and pull requests.
- No secrets are stored in source files. The workflow uses the short-lived Actions-provided token.
- The token is not printed or written to reports.
- No checkout of the monitored repository is required to query GitHub's API; only this DevPilot repository's own code is executed.
- No deployment, merge, branch mutation, pull-request creation, or production database connection is included.
- Reports are workflow artifacts and may contain repository metadata; limit artifact retention.
- Any future AI or repair stage must be added separately with least-privilege credentials and human review. It must not be able to merge or deploy.
