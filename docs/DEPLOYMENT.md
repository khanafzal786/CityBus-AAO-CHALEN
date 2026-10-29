# Deployment

## Current private hosted site

The `.openai/hosting.json` binds `DB` to a durable D1 database. The platform builds React/Vinext for Workers, applies the committed Drizzle migrations and serves client assets and REST endpoints on one origin. Preserve the same project ID for later updates. Runtime DEMO_MODE=true is suitable only for the owner-private preview. Source, schema and images are included in the repository; no credentials, local databases or runtime keys are committed.

## Standalone Node deployment

Use `server/node/README.md` for the Express adapter and `npm run build:client` for the ordinary React/Vite frontend. Express can serve both the built frontend and API. Use HOST=0.0.0.0 for a container, PORT for the service port and PUBLIC_ORIGIN for its HTTPS origin. Use a durable SQLITE_PATH volume for a single-instance pilot. Do not deploy SQLite on ephemeral storage. Use TLS termination, process supervision, platform rate limits, encrypted backups and monitoring.

A static host such as Vercel/Netlify may serve `standalone-dist`; proxy `/api/*` to the backend under the same origin. Do not copy the hosted Worker server bundle into a plain Node runtime. Render/Railway/AWS or another Node host can run the Express option. No account, domain or provider purchase is performed by this repository.

## PostgreSQL migration

The hosted database is D1/SQLite. To use a managed PostgreSQL database, create an async implementation of the small prepare/bind/first/all/run/batch interface or migrate the controller to a PostgreSQL ORM. Convert SQLite conflict syntax/placeholders/booleans and migration types, reproduce unique and foreign-key constraints, run a one-time verified data migration, and test transaction/concurrency behaviour. Change SQLite's single-file operations and ensure batches are transactional. DATABASE_URL is reserved only; it is not currently wired. A Neon/Supabase/other managed PostgreSQL deployment requires this work, credentials and a verified provider setup.

## Maps

The present fallback is an SVG schematic. The map component receives latitude/longitude, ordered stops, vehicle mode, stale flag and next-stop ETA. A future Mapbox or Google Maps adapter should consume this same data, draw route geometry and markers, and preserve DEMO/GPS distinctions. Browser map keys must be domain-restricted and limited to required APIs; never send server/payment secrets to the client. MAPS_API_KEY is a documented placeholder, not an active integration. No geocoding or road-routing API is called.

## Assets and environment

Original assets are in `public/assets/brand`. The logo and bus are not regenerated or substituted. Images are supplied at full quality; a production asset pipeline can provide WebP/AVIF sizes with the same visual identity. Local `.dev.vars` and secret values are ignored. `.env.example` intentionally has no secrets.

## Before changing the audience to public

Set DEMO_MODE=false, invalidate/remove demo users and sessions, replace all sample transit data, provision a real admin securely, complete the production checklist, then rebuild/redeploy. Do not expose the private demo's administrator sign-in buttons to public traffic. The hosting audience was kept private for this delivery.
