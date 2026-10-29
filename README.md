# CITYBUS — AAO CHALEN

**Smart Mobility. Affordable Journeys.** A working full-stack mobility prototype around the supplied CITYBUS identity, with a React interface, persistent server API, passenger accounts, fleet workspace and admin workspace.

## What runs today

- Branded responsive homepage and mobile navigation; original supplied bus image and logo.
- Stop-to-stop search backed by relational data, correct stop ordering, segment fares, three sorting options, available vehicles and empty states.
- Searchable route directory, stop timeline, favourite routes/stops, saved places, recent searches and profile edits.
- Register, sign in, sign out, scrypt password hashes and revocable HttpOnly sessions.
- Server-enforced admin/operator roles, fleet ownership and permitted-route checks.
- 15 demo stops, 6 demo routes, 10 buses, segment fares, pass concepts and alerts.
- Persistent contact inbox and operator applications; admin review and operator promotion.
- Admin management of buses, routes, ordered route stops, stops, fares, passes, alerts, accounts and route permissions.
- Operator bus create/edit/disable via status, assigned-route editing, stop sequencing, service alerts and GPS simulation controls.
- Authenticated GPS ingestion, bounded history, stale-location flags and an approximate distance/speed ETA.
- Simulated moving buses on an explicitly labelled SVG schematic, refreshed every 5 seconds.
- Browser geolocation to sort nearby stops, plus manual search fallback.
- Disabled payment/pass purchases, CityMoney and Pro previews. No charges, balances or fictitious financial success.

## Stack and the hosting adaptation

React 19 + TypeScript + Vite/Vinext; framework REST handlers delegate to `server/api.ts`. Cloudflare Workers runs the server; Cloudflare D1 is the durable SQLite-compatible database. Drizzle owns the schema and generated SQL migrations. Zod validates input, Node crypto supplies scrypt/session tokens, and every SQL value is bound to a prepared statement.

This hosted build uses **Workers + D1**, not Express/PostgreSQL/Prisma. The requested stack was a preference; this adaptation lets the full backend and database run on the available hosting. A PostgreSQL migration is a separate deployment task, not a switch implemented by setting DATABASE_URL. See `docs/DEPLOYMENT.md`. Tracking currently uses polling rather than WebSockets. A production geographic map provider, email recovery and payment gateway are not connected.

## Project layout

```
app/                         Framework pages, API adapter and responsive styles
client/src/                  React product screens and API client
client/src/components/       Forms, fleet/admin workspace and schematic map
server/api.ts                REST controller, authorization and validation
server/services/             Password/session helpers, ETA distance and demo seed
server/node/                 Optional standalone Node/Express adapter (see its README)
db/schema.ts                 24 relational tables
drizzle/                    Generated schema-only SQL migrations and metadata
public/assets/brand/         Unmodified official uploaded assets
tests/                      Isolated database/API integration tests
docs/                       API, deployment, security and production roadmap
.env.example                 Non-secret settings reference
```

## Install

Use Node 24 (Node 22.13+ for the hosted framework; tests use node:sqlite). Corepack/pnpm is the reproducible installation path:

```sh
corepack enable
corepack pnpm install --frozen-lockfile
```

The repository retains the supported starter `npm run install:ci` helper as an alternative. Plain `npm install` is not the supported locked path because this managed starter uses pnpm workspace configuration. Do not mix generated lockfiles.

## Local database and seed

Copy `.env.example` to `.dev.vars`. Set `DEMO_MODE=true` **for local/private demo use only**. Do not commit `.dev.vars`.

```sh
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --filedrizzle/0000_early_crystal.sql
npm run dev
```

The first API request with DEMO_MODE=true inserts the demo dataset in an atomic, idempotent batch. No demo password exists in source. Production migrations create the schema only and never silently load fictional transport data. Hosting applies migrations separately to its durable database. Local and hosted records are different.

After changing `db/schema.ts`:

```sh
npm run db:generate
```

Apply only the newly generated migrations locally, in order. Never replay the initial migration or modify an applied migration. Drizzle is used here, so there is no Prisma migration command.

## Demo accounts and access

On **Sign in**, use the Passenger, Operator or Admin button under “Explore the private demo.” These create revocable server sessions for fictional shared records (`passenger@example.test`, `operator@example.test`, `admin@example.test`). They are not passwords for real people. The buttons and endpoint are enabled only by DEMO_MODE=true. Existing demo sessions are rejected when this flag is false. Keep this deployment owner-private while the flag is true.

You can also register a normal passenger account with your own password (10–128 characters). Only passenger roles can self-register. Never enter sensitive information into a shared demo account. Password recovery currently reports that email delivery is not connected; it does not pretend to email a reset link.

For an operator application: create a passenger account, submit an application with the same email, approve it in Admin > Applications, then assign route permissions under Admin > Permissions. Operator approvals never invent an initial password or send an unrequested email.

## Run / verify

```sh
npm run dev          # frontend and server together
npm run typecheck
npm test             # isolated SQLite: auth, role boundaries, CRUD, search, GPS, forms
npm run build
npm start            # built Worker preview
```

The managed environment uses the Sites preview supervisor instead of directly starting a second server. The frontend and backend share one origin; no CORS wildcard is needed. The REST backend is framework-independent except for its small D1-compatible storage interface.

## Demo workflow for a pitch

1. Start on Home: your official blue CITYBUS bus and original logo are prominent.
2. Search Polytechnic → Charbagh Railway Station and compare the demo results.
3. Open CB101, inspect the stop timeline, then Track Bus.
4. Sign in as demo passenger, save a route and a stop; see them in My account.
5. Open demo operator to manage the fleet and simulate GPS.
6. Open demo admin to review applications, set fares, edit ordered stops and manage messages.
7. Show Passes / CityMoney as coming soon, without making payment claims.

## Quality checks and limits

The production build, TypeScript check and automated API/database tests are included. `docs/QA.md` records results. The environment blocked browser inspection, so screenshot, visual responsive checks and browser console verification remain unverified. CSS includes responsive layouts for 375, 430, 768, 1024, 1280 and 1440 widths, but those are not claimed as visually tested.

The website is a **full-stack prototype**, not a commercially launched transit service or security-audited production platform. All demo routes, fares, ETAs and vehicle details must be replaced with verified operator data. In particular, features depicted on the supplied bus render (Wi-Fi, wallet, Pro) are concept artwork, not operating benefits.

See `docs/API.md`, `docs/DEPLOYMENT.md`, `docs/SECURITY.md` and `docs/PRODUCTION.md` for implementation details and launch requirements.
