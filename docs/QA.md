# QA record

## Verified during implementation

- React/Vinext production build completes.
- TypeScript type checking completes.
- Automated integration tests use a fresh isolated SQLite database with the actual migrations and API handler.
- Tests cover seed data, forward/reverse journey sequences and fares, unauthenticated/incorrect-role rejection, registration/password hashing/login/logout, invalid credentials, favourite ownership/history, admin CRUD/role confirmation, operator scoping, GPS ingestion/range checks, simulation, form storage, application approval, cross-site rejection, disabled demo auth, nearby ordering, disabled payments and rate limiting.
- The source preserves all three supplied brand assets without visual edits.

## Not verified in this environment

The managed preview supervisor reported running, but browser inspection was blocked by browser policy. No workaround browser was used. Consequently no screenshots, browser console checks, interactive browser flows or rendered viewport checks are claimed. The 375/430/768/1024/1280/1440 CSS layouts should be reviewed in a real browser before a public pilot.

Real GPS hardware, email delivery, external maps, payment gateways and PostgreSQL are not configured or tested. The schematic and private demo accounts are explicit prototype features. Node/Express uses the shared tested controller; its runtime smoke-test results are recorded in the delivery when run.

The standalone Vite client build also completed. An Express HTTP smoke test is included at `tests/express-smoke.ts`, but this environment denied the tsx IPC listener (EPERM), so the HTTP runtime test could not run here. It was not counted as passed. Run it locally after installation using `server/node/node_modules/.bin/tsx tests/express-smoke.ts`.
