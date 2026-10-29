import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { handle } from "./api-bundle.mjs";
const sqlite = new DatabaseSync(":memory:");
sqlite.exec("PRAGMA foreign_keys=ON");
for (const f of readdirSync("drizzle").filter((x) => x.endsWith(".sql")))
  sqlite.exec(readFileSync("drizzle/" + f, "utf8"));
const prepare = (sql) => {
  let args = [];
  const p = {
    bind(...a) {
      args = a;
      return p;
    },
    async first() {
      return sqlite.prepare(sql).get(...args) || null;
    },
    async all() {
      return { results: sqlite.prepare(sql).all(...args) };
    },
    async run() {
      sqlite.prepare(sql).run(...args);
      return { success: true };
    },
  };
  return p;
};
const db = {
  prepare,
  async batch(q) {
    sqlite.exec("BEGIN");
    try {
      const r = [];
      for (const s of q) r.push(await s.run());
      sqlite.exec("COMMIT");
      return r;
    } catch (e) {
      sqlite.exec("ROLLBACK");
      throw e;
    }
  },
};
const env = { DB: db, DEMO_MODE: "true" };
let cookie = "",
  admin = "",
  passenger = "",
  operator = "";
async function req(path, method = "GET", data, session = cookie, extra = {}) {
  const r = await handle(
    new Request("http://localhost/api/" + path, {
      method,
      headers: {
        "content-type": "application/json",
        ...(session ? { cookie: session } : {}),
        ...extra,
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    }),
    env,
  );
  const d = await r.json();
  return {
    status: r.status,
    data: d,
    cookie: r.headers.get("set-cookie")?.split(";")[0],
  };
}
await test("seed populates 15 stops, 6 routes and 10 buses", async () => {
  assert.equal((await req("stops")).data.length, 15);
  assert.equal((await req("routes")).data.length, 6);
  assert.equal((await req("buses")).data.length, 10);
});
await test("journey sequence and segment fares", async () => {
  const r = await req("journey/search?source=s0&destination=s8");
  assert.equal(r.status, 200);
  assert.ok(r.data.length >= 2);
  assert.equal(r.data.find((x) => x.routeCode === "CB101").fare, 20);
  assert.deepEqual(
    (await req("journey/search?source=s8&destination=s0")).data,
    [],
  );
});
await test("unauthenticated admin is rejected", async () =>
  assert.equal((await req("admin/users")).status, 401));
await test("registration hashes password; logout revokes session", async () => {
  const r = await req("auth/register", "POST", {
    fullName: "Test Passenger",
    email: "qa@example.test",
    phone: "",
    password: "Test-only-long-password",
    confirmPassword: "Test-only-long-password",
  });
  assert.equal(r.status, 200);
  passenger = r.cookie;
  assert.match(
    sqlite
      .prepare("SELECT passwordHash FROM users WHERE email='qa@example.test'")
      .get().passwordHash,
    /^scrypt:/,
  );
  assert.equal(
    (await req("admin/users", "GET", undefined, passenger)).status,
    403,
  );
  assert.equal((await req("auth/logout", "POST", {}, passenger)).status, 200);
  assert.equal((await req("me", "GET", undefined, passenger)).status, 401);
  const login = await req("auth/login", "POST", {
    email: "qa@example.test",
    password: "Test-only-long-password",
  });
  assert.equal(login.status, 200);
  passenger = login.cookie;
});
await test("invalid login and invalid fields rejected", async () => {
  assert.equal(
    (
      await req("auth/login", "POST", {
        email: "qa@example.test",
        password: "wrong",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await req("auth/register", "POST", {
        fullName: "X",
        email: "not-an-email",
        password: "short",
      })
    ).status,
    400,
  );
});
await test("favourites and history persist and are owner scoped", async () => {
  assert.equal(
    (await req("me/favouriteRoutes", "POST", { routeId: "r0" }, passenger))
      .status,
    201,
  );
  await req(
    "journey/search?source=s0&destination=s8",
    "GET",
    undefined,
    passenger,
  );
  const m = (await req("me", "GET", undefined, passenger)).data;
  assert.equal(m.favouriteRoutes.length, 1);
  assert.equal(m.journeys.length, 1);
  const other = await req("auth/demo", "POST", { role: "PASSENGER" });
  assert.equal(
    (await req("me", "GET", undefined, other.cookie)).data.favouriteRoutes
      .length,
    0,
  );
  await req(
    "me/favouriteRoutes/" + m.favouriteRoutes[0].favouriteId,
    "DELETE",
    {},
    other.cookie,
  );
  assert.equal(
    (await req("me", "GET", undefined, passenger)).data.favouriteRoutes.length,
    1,
  );
});
await test("admin CRUD and role confirmation", async () => {
  admin = (await req("auth/demo", "POST", { role: "ADMIN" })).cookie;
  assert.equal(
    (await req("admin/overview", "GET", undefined, admin)).status,
    200,
  );
  const data = {
    stopName: "QA Stop",
    latitude: 26.8,
    longitude: 80.9,
    city: "Lucknow",
    address: "Test",
    active: 1,
  };
  assert.equal((await req("admin/stops", "POST", data, admin)).status, 201);
  const s = (await req("admin/stops", "GET", undefined, admin)).data.find(
    (x) => x.stopName === "QA Stop",
  );
  assert.equal(
    (
      await req(
        "admin/stops/" + s.id,
        "PATCH",
        { ...data, stopName: "Edited QA Stop" },
        admin,
      )
    ).status,
    200,
  );
  await req("admin/stops/" + s.id, "DELETE", {}, admin);
  assert.ok(!(await req("stops")).data.some((x) => x.id === s.id));
  assert.equal(
    (await req("admin/users/demo-passenger", "PATCH", { role: "ADMIN" }, admin))
      .status,
    400,
  );
});
await test("operator boundaries and GPS validation", async () => {
  operator = (await req("auth/demo", "POST", { role: "OPERATOR" })).cookie;
  assert.equal(
    (await req("operator/buses", "GET", undefined, operator)).data.length,
    10,
  );
  assert.equal(
    (await req("admin/stops", "GET", undefined, operator)).status,
    403,
  );
  assert.equal(
    (
      await req(
        "buses/b0/location",
        "POST",
        {
          latitude: 100,
          longitude: 80,
          speed: 20,
          timestamp: new Date().toISOString(),
        },
        operator,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await req(
        "buses/b0/location",
        "POST",
        {
          latitude: 26.86,
          longitude: 80.98,
          speed: 20,
          timestamp: new Date().toISOString(),
        },
        passenger,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await req(
        "buses/b0/location",
        "POST",
        {
          latitude: 26.86,
          longitude: 80.98,
          speed: 20,
          timestamp: new Date().toISOString(),
        },
        operator,
      )
    ).status,
    200,
  );
  assert.equal((await req("buses/b0/location")).data.mode, "GPS");
  assert.equal(
    (await req("buses/b0/simulate", "POST", {}, operator)).status,
    200,
  );
  assert.equal((await req("buses/b0/location")).data.mode, "DEMO");
});
await test("contact and partner applications are saved and approved", async () => {
  assert.equal(
    (
      await req("contact", "POST", {
        name: "Test",
        email: "test@example.test",
        phone: "",
        subject: "Test message",
        message: "Prototype QA message",
      })
    ).status,
    201,
  );
  assert.equal(
    (await req("admin/contact", "GET", undefined, admin)).data.length,
    1,
  );
  const d = {
    companyName: "QA Fleet",
    contactPerson: "Test Passenger",
    email: "qa@example.test",
    phone: "0000000000",
    city: "Lucknow",
    numberOfBuses: 2,
    currentRoutes: "Example route",
    gpsAvailable: 0,
    message: "QA application",
  };
  assert.equal((await req("operators/apply", "POST", d)).status, 201);
  const a = (await req("admin/applications", "GET", undefined, admin)).data[0];
  assert.equal(
    (
      await req(
        "admin/applications/" + a.id,
        "PATCH",
        { status: "APPROVED" },
        admin,
      )
    ).status,
    200,
  );
  const newop = (await req("operator/overview", "GET", undefined, passenger))
    .data;
  assert.equal(newop.buses.length, 0);
  assert.equal(
    (await req("buses/b0/simulate", "POST", {}, passenger)).status,
    403,
  );
});
await test("cross-site mutation blocked and demo auth off in production", async () => {
  assert.equal(
    (
      await req("contact", "POST", {}, "", {
        origin: "https://attacker.example",
      })
    ).status,
    403,
  );
  env.DEMO_MODE = "false";
  assert.equal((await req("auth/demo", "POST", { role: "ADMIN" })).status, 404);
  env.DEMO_MODE = "true";
});
await test("nearby stops sorted and payments disabled", async () => {
  const r = await req("stops/nearby?lat=26.8704&lng=80.9954");
  assert.equal(r.data[0].id, "s0");
  assert.equal((await req("payments", "POST", {})).status, 503);
});
await test("rate limiting is durable", async () => {
  for (let i = 0; i < 35; i++)
    await req("auth/login", "POST", {
      email: "none@example.test",
      password: "no",
    });
  assert.equal(
    (
      await req("auth/login", "POST", {
        email: "none@example.test",
        password: "no",
      })
    ).status,
    429,
  );
});
