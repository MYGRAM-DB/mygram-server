# Free staging strategy for MYGRAM TWIN

## Decision

Use the Supabase local stack in CI as the primary free integration-test environment. Keep the hosted MYGRAM Supabase project as production only. Do not create a paid Supabase development branch.

Neon Free is a valid optional hosted PostgreSQL test target when a reachable remote database is specifically needed, but it does not provide Supabase Auth, Storage, or the Supabase API surface by itself. Using Neon for the main integration suite would require extra wiring and would not reproduce the application's current Supabase Auth flow.

## Why local Supabase first

- Runs PostgreSQL, Auth, Storage, and other Supabase services locally in the CI runner.
- Does not create an additional hosted database or incur Supabase branch compute charges.
- Keeps test data isolated from the production project.
- Can be started in GitHub Actions with the Supabase CLI and a compatible container runtime.

Official guide: https://supabase.com/docs/guides/local-development

## Current readiness gap

The current `MYGRAM-DB/mygram-app` repository has browser tests and uses the Supabase JavaScript client, but it does not currently contain a `supabase/config.toml` or a `supabase/migrations/` directory on `main`. Therefore, do not start a local database integration suite yet: first establish version-controlled migrations that accurately represent the intended schema and RLS policies.

The existing hosted project contains production data and must not be used as a test target by CI. Do not copy production data into the test environment. Use synthetic fixtures only.

## Next safe steps

1. Inspect the hosted schema read-only and compare it with the app's intended data model.
2. Create reviewed migrations in a separate app branch, without applying them to production.
3. Add a CI job that starts local Supabase, applies migrations, seeds synthetic test data, and tests RLS/Auth behavior.
4. Keep the existing Playwright and JavaScript syntax checks.
5. Permit automated repair PRs only after checks pass. Do not auto-merge, deploy, or modify production data.
6. Store credentials only in GitHub Actions secrets; never put service-role keys in browser code or commit them.

## Cost note

Local Supabase itself has no hosted branch fee. GitHub Actions usage is still subject to the account's included runner minutes and quotas. Neon Free is $0 within its published quotas (currently 100 CU-hours and 1 GB Postgres storage per project, plus network-transfer limits); compute can be suspended when a quota is exhausted.
