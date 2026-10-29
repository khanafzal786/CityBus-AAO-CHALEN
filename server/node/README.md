# Standalone Express + SQLite option

This optional adapter runs the **same API handler** as the hosted Worker. It uses Node's built-in SQLite database with automatic ordered migrations, Express 5 and Helmet. Require Node 24. Hosted D1 remains the private website's runtime database.

From the repository root:

```sh
npm install --prefix server/node
npm run build:client
# macOS/Linux:
DEMO_MODE=true npm start --prefix server/node
# Windows PowerShell:
# $env:DEMO_MODE='true'; npm start --prefix server/node
```

Open http://localhost:3001. For separate development terminals, run the Express server and `npm run dev:client`; the Vite frontend proxies /api to port 3001. `SQLITE_PATH` chooses a durable file. Default is `citybus.sqlite` in the repository root. SQLite files are ignored by Git. For external deployment change HOST to 0.0.0.0, set PUBLIC_ORIGIN to the actual HTTPS origin and place the app behind a trusted reverse proxy. Do not accept arbitrary forwarded headers. DEMO_MODE must be false for a public production instance.

Production multi-instance deployment needs managed PostgreSQL and a compatible async adapter, distributed throttling and migrations reviewed for that engine. The included adapter is SQLite, not PostgreSQL. DATABASE_URL is a reserved configuration placeholder and is not consumed.
