# From prototype to pilot

1. Agree a small pilot with a verified fleet owner. Confirm permits, responsibilities, support, service hours and route coverage. Do not claim government partnerships without an agreement.
2. Replace demo routes/stops/fares with licensed or operator-provided records; validate direction, coordinates, fare stages, stop names and timetable changes. Decide on transfer search separately.
3. Integrate GPS devices with per-bus credentials, clock/replay checks and store-and-forward telemetry. Validate stationary/off-route behaviour and stale data, then calibrate ETA from route geometry and speed history. Add traffic/historical inputs before discussing AI predictions.
4. Connect a licensed map provider with restricted keys, billing limits and required attribution.
5. Complete email verification and password recovery; add privileged-account MFA and secure administrator provisioning.
6. Payments: choose an approved provider; create orders server-side, use hosted checkout, verify signatures and webhook authenticity, enforce idempotency, reconcile settlements and maintain an auditable ledger. Publish refund/dispute policies and complete applicable compliance review. Never trust a frontend “success” flag.
7. CityMoney: define whether it is merely a gateway payment method or a regulated stored-value product with qualified legal/payment counsel. The existing schema is not authorization to operate a wallet. Add ledger reconciliation, limits and appropriate safeguards before enabling it.
8. Passes/Pro: confirm entitlements, operators accepting them, refunds and benefits. Do not promise Wi-Fi, discounts, water or rewards simply because the concept artwork depicts them.
9. Complete privacy/legal review, consent/retention policies, support escalation, accessibility review and data-deletion/export mechanisms.
10. Provision a managed durable database, logging, metrics, alerts, backups and recovery tests. Add API pagination, query indexes, concurrency/load tests and operational dashboards.
11. Run independent security testing, mobile browser tests at 375/430/768/1024/1280/1440 widths, keyboard/screen-reader review and GPS field trials.
12. Remove demo access and all fictional claims, then launch a controlled pilot with real support and clear availability notices.
