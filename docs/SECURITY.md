# Security implementation and boundaries

Implemented: scrypt with a random 16-byte salt and 64-byte derived key, random 256-bit session tokens hashed at rest, HttpOnly/SameSite=Strict cookies (Secure on HTTPS), one-day expiry, server revocation on logout, role-change session invalidation, disabled-user enforcement, server RBAC, operator ownership and approval checks, explicit operator-route grants, Zod input schemas, bound SQL, bounded JSON payloads, generic login errors and no returned password hashes or stack traces.

Mutation endpoints reject cross-origin Origin headers, Sec-Fetch-Site=cross-site and non-JSON content. The Node adapter adds Helmet; the hosted API sets its own relevant response headers. CORS is deliberately same-origin, not permissive. React escapes text rather than rendering submitted HTML. Role changes require an explicit UI confirmation and backend confirmRole flag. The account cannot alter its own privileged role/disable itself.

A database rate-limit counter limits mutations per IP/endpoint window: 30 authentication requests or 100 other writes in 10 minutes. On the Express adapter the peer socket address is used and client-supplied forwarding headers are ignored. Behind a trusted proxy, configure and verify real-client IP handling rather than enabling arbitrary trust. Add edge DDoS protection and per-user/device limits before public deployment. The seed flag is idempotent and seed inserts run in a batch; runtime schema creation is never used on Workers.

DEMO_MODE is an intentional **private testing capability** with passwordless shared demo roles. It defaults off when absent. Do not set it true on a public app. Disabling it also rejects pre-existing demo sessions. Keep secrets out of source and out of browser data.

Remaining hardening: verified email ownership, secure emailed password-reset tokens, MFA for administrators, CSRF threat-model review for deployment proxies, distributed abuse controls, exhaustive authorization audit, content-security policy review for the hosted framework, audit-event retention/export, data retention/deletion workflows, dependency monitoring, encrypted backups, restore tests, fleet-device credentials and production load testing. Operator approval currently matches account email without an email-verification service; add verification before treating account ownership as verified.

Contact messages, applications and histories need retention policies before real personal information is collected. This implementation is not a completed independent security audit or a compliance certification.
