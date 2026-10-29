# CITYBUS REST API

All paths are under `/api`. Send JSON with Content-Type: application/json for mutations. Errors use `{ "error": "..." }`; status codes include 400 validation, 401 sign-in required, 403 denied, 404 missing, 409 conflict, 429 rate limit and 500 generic internal error. Maximum JSON body is 20 KB. Lists are bounded for management; large production datasets require pagination.

## Public / passenger

| Method | Path | Behaviour |
|---|---|---|
| GET | /health | Health and demo flag |
| POST | /auth/register | fullName, email, phone, password, confirmPassword; passenger-only |
| POST | /auth/login | email, password; sets HttpOnly session cookie |
| POST | /auth/logout | Revokes current session |
| GET | /auth/me | Safe current user and demo flag |
| POST | /auth/demo | role; **private/local DEMO_MODE only** |
| POST | /auth/forgot-password | email; reports recovery delivery unavailable |
| GET | /routes?q= | Route code, name, source, destination or bus number search |
| GET | /routes/:id | Ordered stops and buses |
| GET | /stops?q= | Stop name search with associated routes |
| GET | /stops/nearby?lat=&lng= | Closest 8 stops sorted by Haversine distance |
| GET | /journey/search?source=&destination= | Stop IDs or exact names; enforces source before destination |
| GET | /buses | Vehicle information |
| GET | /buses/:id | Vehicle + current location/next stop/ETA |
| GET | /buses/:id/location | GPS or clearly labelled simulation; stale flag |
| GET | /alerts | Active alerts within their date range |
| GET | /passes | Coming-soon plans, no purchase |
| POST | /operators/apply | Partnership application, see Zod schema |
| POST | /contact | name, email, phone, subject, message |
| GET | /me | Profile, favourite routes/stops, saved places and last 20 searches |
| PATCH | /me/profile | fullName, phone |
| POST | /me/favouriteRoutes | routeId |
| POST | /me/favouriteStops | stopId |
| POST | /me/savedPlaces | label, stopId |
| DELETE | /me/:collection/:id | Owner-scoped removal for the above 3 collections |
| POST | /payments | Explicit 503 unavailable; no money moves |

`/me` endpoints require authentication. Data is isolated by current user ID. A route can appear with zero available buses so users can still inspect it; tracking is disabled for that search result.

## Fleet and administration

`/admin/*` requires ADMIN. `/operator/*` requires an approved OPERATOR (or ADMIN where applicable). Operators are scoped to their own fleet and explicitly granted routes. Server checks are authoritative; hiding buttons is not used as authorization.

| Method | Path | Behaviour |
|---|---|---|
| GET | /admin/overview | Counts for users, operators, buses, active buses, routes, stops, messages and applications |
| GET | /operator/overview | Operator profile, own buses, permitted routes and recent audit events |
| GET/POST/PATCH | /admin/{buses,routes,stops,fares,alerts,passes}[/id] | List/create/update; PATCH requires the full editor fields |
| DELETE | /admin/{buses,routes,stops,alerts,passes}/:id | Soft disable; no destructive removal of network records |
| DELETE | /admin/fares/:id | Remove fare pair |
| GET/PATCH | /admin/users[/id] | Safe fields only; role changes require confirmRole=true; cannot change own role/disable self |
| GET/PATCH | /admin/operators[/id] | APPROVED / SUSPENDED |
| GET/PATCH | /admin/applications[/id] | Approve/reject; matching registered email required for approval |
| GET/PATCH | /admin/contact[/id] | NEW / IN_PROGRESS / RESOLVED |
| GET/POST/DELETE | /admin/permissions | Grant/revoke operatorId + routeId |
| GET/POST/PATCH | /operator/buses[/id] | Own fleet only; route must be assigned to operator |
| GET/PATCH | /operator/routes[/id] | Only assigned routes; creating routes is admin-only |
| GET/POST/PATCH | /operator/alerts[/id] | Only assigned routes and buses on that route |
| GET/PUT | /{admin,operator}/routes/:id/stops | Ordered list of {stopId, estimatedOffsetMinutes}; replacement clears old fares |
| POST | /buses/:id/location | Authorized owner/admin GPS update |
| POST | /buses/:id/simulate | Authorized owner/admin; DEMO_MODE only |

## GPS integration

Authenticate as the approved operator and send:

```json
{
  "latitude": 26.8704,
  "longitude": 80.9954,
  "speed": 18,
  "timestamp": "2026-10-23T12:00:00.000Z"
}
```

Use a current UTC timestamp when testing. Coordinates are range-checked, speed must be 0–150 km/h, timestamps must be no older than 5 minutes and no more than 1 minute in the future. Existing GPS updates reject out-of-order timestamps. At most approximately 100 history points are retained per bus. Locations older than 2 minutes show as stale and do not produce an ETA.

GET location polls every 5 seconds. Demo movement is computed from clock time along seeded stop coordinates, not stored as actual GPS telemetry. GPS mode is stored explicitly. ETA uses distance to the approximate next stop / recent speed, with an 18 km/h average fallback and an 8 km/h floor. This is not route-matched traffic-aware prediction. Search arrivals are illustrative demo offsets; map ETAs change with the simulated position. Production must replace both with a calibrated route-aware arrival service.

For hardware, introduce revocable per-device credentials with bus-scoped ingestion permissions rather than giving devices administrator credentials. Add message signatures, replay protection, device onboarding, route matching and monitoring before a fleet rollout. WebSockets/SSE can replace polling behind a durable fan-out service; this repo does not claim an operational WebSocket layer.
