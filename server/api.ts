import { z } from "zod";
import { seed } from "./services/seed";
import {
  hashPassword,
  verifyPassword,
  token,
  digest,
  distance,
} from "./services/security";
const txt = z.string().trim().min(1).max(200),
  email = z
    .string()
    .trim()
    .email()
    .max(200)
    .transform((s) => s.toLowerCase()),
  phone = z.string().trim().max(20),
  optional = z.string().trim().max(200).default("");
const num = z.coerce.number().finite(),
  flag = z.coerce.number().int().min(0).max(1),
  id = z.string().min(1).max(80),
  status = z.enum(["ACTIVE", "INACTIVE", "ON_ROUTE", "DELAYED", "MAINTENANCE"]);
const schemas: any = {
  routes: z.object({
    routeCode: txt,
    routeName: txt,
    source: txt,
    destination: txt,
    estimatedDuration: num.int().min(1).max(600),
    baseFare: num.min(0).max(10000),
    active: flag.default(1),
  }),
  stops: z.object({
    stopName: txt,
    latitude: num.min(-90).max(90),
    longitude: num.min(-180).max(180),
    city: txt,
    address: optional,
    active: flag.default(1),
  }),
  buses: z.object({
    operatorId: id,
    busNumber: txt,
    registrationNumber: txt,
    routeId: id.nullable(),
    capacity: num.int().min(1).max(200),
    type: z.enum(["AC", "NON_AC", "ELECTRIC"]),
    status,
  }),
  fares: z.object({
    routeId: id,
    sourceStopId: id,
    destinationStopId: id,
    fareAmount: num.min(0).max(10000),
  }),
  alerts: z.object({
    title: txt,
    description: z.string().trim().min(1).max(2000),
    severity: z.enum(["INFO", "WARNING", "CRITICAL"]),
    routeId: id.nullable().default(null),
    busId: id.nullable().default(null),
    active: flag.default(1),
    startsAt: z
      .string()
      .datetime()
      .default(() => new Date().toISOString()),
    endsAt: z.string().datetime().nullable().default(null),
  }),
  passes: z.object({
    name: txt,
    type: z.enum(["DAILY", "STUDENT", "MONTHLY"]),
    duration: num.int().min(1).max(366),
    price: num.min(0).max(50000),
    active: flag.default(1),
  }),
  applications: z.object({
    companyName: txt,
    contactPerson: txt,
    email,
    phone: phone.min(7),
    city: txt,
    numberOfBuses: num.int().min(1).max(10000),
    currentRoutes: txt,
    gpsAvailable: flag,
    message: z.string().trim().max(2000).default(""),
  }),
  contact: z.object({
    name: txt,
    email,
    phone,
    subject: txt,
    message: z.string().trim().min(5).max(3000),
  }),
};
const tables: any = {
  routes: "routes",
  stops: "stops",
  buses: "buses",
  fares: "fares",
  alerts: "serviceAlerts",
  passes: "passes",
  applications: "operatorApplications",
  contact: "contactMessages",
  operators: "operators",
  users: "users",
};
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const fail = (n: number, s: string): never => {
  throw new ApiError(n, s);
};
export async function handle(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url),
    p = url.pathname
      .replace(/^\/api\/?/, "")
      .split("/")
      .filter(Boolean),
    method = request.method,
    db = env.DB;
  let cookie = "";
  const out = (v: any, s = 200) =>
    new Response(JSON.stringify(v), {
      status: s,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "same-origin",
        "X-Frame-Options": "SAMEORIGIN",
        ...(cookie ? { "Set-Cookie": cookie } : {}),
      },
    });
  try {
    if (!db) fail(503, "Database is not configured.");
    const all = async (sql: string, ...args: any[]) => {
      const r = await db
        .prepare(sql)
        .bind(...args)
        .all();
      return r.results || [];
    };
    const one = async (sql: string, ...args: any[]) =>
      db
        .prepare(sql)
        .bind(...args)
        .first();
    const run = async (sql: string, ...args: any[]) =>
      db
        .prepare(sql)
        .bind(...args)
        .run();
    const insert = async (table: string, row: any) => {
      const keys = Object.keys(row);
      await run(
        `INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
        ...Object.values(row),
      );
      return row;
    };
    const update = async (table: string, key: string, row: any) => {
      const keys = Object.keys(row);
      if (!keys.length) fail(400, "No changes supplied");
      await run(
        `UPDATE ${table} SET ${keys.map((k) => k + "=?").join(",")} WHERE id=?`,
        ...Object.values(row),
        key,
      );
    };
    const now = () => new Date().toISOString();
    const body = async () => {
      const raw = await request.text();
      if (raw.length > 20000) fail(413, "Request too large");
      try {
        return JSON.parse(raw);
      } catch {
        fail(400, "Invalid JSON");
      }
    };
    if (!["GET", "HEAD"].includes(method)) {
      const origin = request.headers.get("origin");
      if (origin && origin !== url.origin)
        fail(403, "Cross-origin requests are not allowed");
      if (request.headers.get("sec-fetch-site") === "cross-site")
        fail(403, "Cross-site requests are not allowed");
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        fail(415, "JSON content type required");
    }
    const demo = env.DEMO_MODE === "true";
    if (demo) await seed(db);
    const rawCookie = request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)citybus_session=([^;]+)/)?.[1];
    let user = rawCookie
      ? await one(
          "SELECT u.* FROM sessions s JOIN users u ON u.id=s.userId WHERE s.id=? AND s.expiresAt>? AND u.disabled=0",
          digest(rawCookie),
          Date.now(),
        )
      : null;
    if (!demo && user?.id.startsWith("demo-")) user = null;
    const safeUser = (u: any) =>
      u
        ? {
            id: u.id,
            fullName: u.fullName,
            email: u.email,
            phone: u.phone,
            role: u.role,
          }
        : null;
    const auth = (roles?: string[]) => {
      if (!user) fail(401, "Please sign in to continue");
      if (roles && !roles.includes(user.role))
        fail(403, "You do not have permission for this action");
      return user;
    };
    const rate = async (limit: number) => {
      const ip = request.headers.get("cf-connecting-ip") || "local";
      const key = digest(
        ip +
          ":" +
          p.slice(0, 2).join("/") +
          ":" +
          Math.floor(Date.now() / 600000),
      );
      const r = await one(
        "INSERT INTO rateLimits (id,count,expiresAt) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count",
        key,
        Date.now() + 600000,
      );
      if (r.count > limit)
        fail(429, "Too many requests. Please try again in 10 minutes.");
      await run("DELETE FROM rateLimits WHERE expiresAt<?", Date.now());
    };
    if (!["GET", "HEAD"].includes(method))
      await rate(p[0] === "auth" ? 30 : 100);
    const session = async (u: any) => {
      const t = token();
      await insert("sessions", {
        id: digest(t),
        userId: u.id,
        expiresAt: Date.now() + 86400000,
      });
      await run("DELETE FROM sessions WHERE expiresAt<?", Date.now());
      cookie = `citybus_session=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${url.protocol === "https:" ? "; Secure" : ""}`;
      return out({ user: safeUser(u) });
    };
    if (p[0] === "health") return out({ ok: true, demo });
    if (p[0] === "auth") {
      if (p[1] === "me" && method === "GET")
        return out({ user: safeUser(user), demo });
      if (p[1] === "register" && method === "POST") {
        const d = z
          .object({
            fullName: txt,
            email,
            phone,
            password: z.string().min(10).max(128),
            confirmPassword: z.string(),
          })
          .refine((d) => d.password === d.confirmPassword, {
            message: "Passwords must match",
          })
          .parse(await body());
        if (await one("SELECT id FROM users WHERE email=?", d.email))
          fail(409, "Unable to create account with these details");
        const u = {
          id: crypto.randomUUID(),
          fullName: d.fullName,
          email: d.email,
          phone: d.phone,
          passwordHash: hashPassword(d.password),
          role: "PASSENGER",
          createdAt: now(),
          updatedAt: now(),
        };
        await insert("users", u);
        return session(u);
      }
      if (p[1] === "login" && method === "POST") {
        const d = z
            .object({ email, password: z.string().max(128) })
            .parse(await body()),
          u = await one("SELECT * FROM users WHERE email=?", d.email);
        const valid = verifyPassword(
          d.password,
          u?.passwordHash ||
            "scrypt:00000000000000000000000000000000:" + "00".repeat(64),
        );
        if (!u || u.disabled || !valid)
          fail(401, "Email or password is incorrect");
        return session(u);
      }
      if (p[1] === "demo" && method === "POST") {
        if (!demo) fail(404, "Not available");
        const role = z
          .enum(["PASSENGER", "OPERATOR", "ADMIN"])
          .parse((await body()).role);
        let u = await one(
          "SELECT * FROM users WHERE id=?",
          "demo-" + role.toLowerCase(),
        );
        if (!u) {
          u = {
            id: "demo-" + role.toLowerCase(),
            fullName: "Demo " + role[0] + role.slice(1).toLowerCase(),
            email: role.toLowerCase() + "@example.test",
            phone: "",
            passwordHash: "DISABLED",
            role,
            createdAt: now(),
            updatedAt: now(),
          };
          await insert("users", u);
        }
        if (u.disabled) fail(403, "Demo account disabled");
        return session(u);
      }
      if (p[1] === "logout" && method === "POST") {
        if (rawCookie)
          await run("DELETE FROM sessions WHERE id=?", digest(rawCookie));
        cookie =
          "citybus_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0";
        return out({ ok: true });
      }
      if (p[1] === "forgot-password" && method === "POST") {
        z.object({ email }).parse(await body());
        return out({
          message:
            "Password recovery email is not connected in this prototype. Contact the platform administrator.",
          available: false,
        });
      }
    }
    const routeDetail = async (routeId: string) => {
      const r = await one("SELECT * FROM routes WHERE id=?", routeId);
      if (!r) fail(404, "Route not found");
      return {
        ...r,
        stops: await all(
          "SELECT s.*,rs.stopOrder,rs.estimatedOffsetMinutes FROM routeStops rs JOIN stops s ON s.id=rs.stopId WHERE rs.routeId=? ORDER BY rs.stopOrder",
          routeId,
        ),
        buses: await all("SELECT * FROM buses WHERE routeId=?", routeId),
      };
    };
    const routeList = () =>
      all(
        `SELECT r.*, (SELECT COUNT(*) FROM routeStops WHERE routeId=r.id) stopCount,(SELECT COUNT(*) FROM buses WHERE routeId=r.id AND status IN ('ON_ROUTE','ACTIVE','DELAYED')) activeBuses FROM routes r WHERE active=1 ORDER BY routeCode`,
      );
    if (p[0] === "routes" && method === "GET") {
      if (p[1]) return out(await routeDetail(p[1]));
      const q = (url.searchParams.get("q") || "").toLowerCase();
      const rows = await routeList();
      const busMatches = q
        ? await all(
            "SELECT DISTINCT routeId FROM buses WHERE LOWER(busNumber) LIKE ?",
            `%${q}%`,
          )
        : [];
      return out(
        rows.filter(
          (r: any) =>
            [r.routeCode, r.source, r.destination, r.routeName]
              .join(" ")
              .toLowerCase()
              .includes(q) || busMatches.some((b: any) => b.routeId === r.id),
        ),
      );
    }
    if (p[0] === "stops" && method === "GET") {
      let rows = await all(
        "SELECT * FROM stops WHERE active=1 ORDER BY stopName",
      );
      const q = (url.searchParams.get("q") || "").toLowerCase();
      rows = rows.filter((s: any) => s.stopName.toLowerCase().includes(q));
      if (p[1] === "nearby") {
        if (!url.searchParams.has("lat") || !url.searchParams.has("lng"))
          fail(400, "Location required");
        const lat = num.min(-90).max(90).parse(url.searchParams.get("lat")),
          lng = num.min(-180).max(180).parse(url.searchParams.get("lng"));
        rows = rows
          .map((s: any) => ({
            ...s,
            distance: distance(lat, lng, s.latitude, s.longitude),
          }))
          .sort((a: any, b: any) => a.distance - b.distance)
          .slice(0, 8);
      }
      for (const s of rows)
        s.routes = await all(
          "SELECT r.id,r.routeCode FROM routeStops rs JOIN routes r ON r.id=rs.routeId WHERE rs.stopId=? AND r.active=1",
          s.id,
        );
      return out(rows);
    }
    if (p[0] === "journey" && p[1] === "search" && method === "GET") {
      const source = txt.parse(url.searchParams.get("source")),
        destination = txt.parse(url.searchParams.get("destination"));
      const rows = await all(
        `SELECT r.*,a.stopOrder startOrder,b.stopOrder endOrder,b.estimatedOffsetMinutes-a.estimatedOffsetMinutes journeyMinutes,s1.stopName fromName,s2.stopName toName,s1.id sourceStopId,s2.id destinationStopId,COALESCE(f.fareAmount,r.baseFare) fare FROM routes r JOIN routeStops a ON a.routeId=r.id JOIN routeStops b ON b.routeId=r.id JOIN stops s1 ON s1.id=a.stopId JOIN stops s2 ON s2.id=b.stopId LEFT JOIN fares f ON f.routeId=r.id AND f.sourceStopId=s1.id AND f.destinationStopId=s2.id WHERE r.active=1 AND s1.active=1 AND s2.active=1 AND a.stopOrder<b.stopOrder AND (s1.id=? OR LOWER(s1.stopName)=LOWER(?)) AND (s2.id=? OR LOWER(s2.stopName)=LOWER(?))`,
        source,
        source,
        destination,
        destination,
      );
      for (const r of rows) {
        r.buses = await all(
          "SELECT * FROM buses WHERE routeId=? AND status IN ('ON_ROUTE','ACTIVE','DELAYED')",
          r.id,
        );
        r.etaMinutes = demo
          ? 3 + (Number(r.id.replace("r", "")) || 0) * 3
          : null;
        r.stopCount = r.endOrder - r.startOrder + 1;
        r.mode = demo ? "DEMO" : "NO_ETA";
      }
      if (user && rows.length)
        await insert("journeys", {
          id: crypto.randomUUID(),
          userId: user.id,
          source: rows[0].fromName,
          destination: rows[0].toName,
          routeId: rows[0].id,
          searchedAt: now(),
        });
      return out(rows);
    }
    if (p[0] === "alerts" && method === "GET")
      return out(
        await all(
          "SELECT a.*,r.routeCode FROM serviceAlerts a LEFT JOIN routes r ON r.id=a.routeId WHERE a.active=1 AND a.startsAt<=? AND (a.endsAt IS NULL OR a.endsAt>?) ORDER BY a.startsAt DESC",
          now(),
          now(),
        ),
      );
    if (p[0] === "passes" && method === "GET")
      return out(await all("SELECT * FROM passes WHERE active=1"));
    const ownedBus = async (busId: string) => {
      auth(["OPERATOR", "ADMIN"]);
      const b = await one(
        "SELECT b.*,o.userId,o.verificationStatus FROM buses b JOIN operators o ON o.id=b.operatorId WHERE b.id=?",
        busId,
      );
      if (!b) fail(404, "Bus not found");
      if (
        user.role !== "ADMIN" &&
        (b.userId !== user.id || b.verificationStatus !== "APPROVED")
      )
        fail(403, "This bus is not in your approved fleet");
      return b;
    };
    const location = async (bus: any) => {
      const stops = await all(
        "SELECT s.*,rs.estimatedOffsetMinutes FROM routeStops rs JOIN stops s ON s.id=rs.stopId WHERE rs.routeId=? ORDER BY rs.stopOrder",
        bus.routeId,
      );
      const live = bus.locationMode === "GPS";
      let latitude = bus.currentLatitude,
        longitude = bus.currentLongitude,
        next = stops[0],
        speed = 18,
        timestamp = bus.lastLocationUpdate;
      if (!live && demo && stops.length > 1) {
        const step =
            (Date.now() / 18000 +
              (Number(bus.id.replace("b", "")) || 0) * 0.43) %
            (stops.length - 1),
          idx = Math.floor(step),
          f = step - idx;
        latitude =
          stops[idx].latitude +
          (stops[idx + 1].latitude - stops[idx].latitude) * f;
        longitude =
          stops[idx].longitude +
          (stops[idx + 1].longitude - stops[idx].longitude) * f;
        next = stops[idx + 1];
        timestamp = now();
      } else if (stops.length && latitude != null) {
        const latest = await one(
          "SELECT speed FROM busLocations WHERE busId=? ORDER BY timestamp DESC LIMIT 1",
          bus.id,
        );
        speed = latest?.speed || 18;
        const near = stops
          .map((s: any, i: number) => ({
            i,
            d: distance(latitude, longitude, s.latitude, s.longitude),
          }))
          .sort((a: any, b: any) => a.d - b.d)[0];
        next = stops[Math.min(near.i + 1, stops.length - 1)];
      }
      const stale = !timestamp || Date.now() - Date.parse(timestamp) > 120000;
      return {
        busId: bus.id,
        latitude,
        longitude,
        timestamp,
        speed,
        mode: live ? "GPS" : "DEMO",
        stale,
        nextStop: next?.stopName || "Unassigned",
        etaMinutes:
          next && latitude != null && !stale
            ? Math.max(
                1,
                Math.ceil(
                  (distance(
                    latitude,
                    longitude,
                    next.latitude,
                    next.longitude,
                  ) /
                    Math.max(speed, 8)) *
                    60,
                ),
              )
            : null,
        stops,
      };
    };
    if (p[0] === "buses") {
      if (method === "GET") {
        if (!p[1])
          return out(
            await all(
              "SELECT b.*,r.routeCode FROM buses b LEFT JOIN routes r ON r.id=b.routeId",
            ),
          );
        const b = await one(
          "SELECT b.*,r.routeCode,r.baseFare FROM buses b LEFT JOIN routes r ON r.id=b.routeId WHERE b.id=?",
          p[1],
        );
        if (!b) fail(404, "Bus not found");
        if (p[2] === "location") return out(await location(b));
        return out({ ...b, location: await location(b) });
      }
      if (p[2] === "location" && method === "POST") {
        const b = await ownedBus(p[1]);
        const d = z
          .object({
            latitude: num.min(-90).max(90),
            longitude: num.min(-180).max(180),
            speed: num.min(0).max(150),
            timestamp: z.string().datetime(),
          })
          .parse(await body());
        const age = Date.now() - Date.parse(d.timestamp);
        if (age > 300000 || age < -60000)
          fail(400, "GPS timestamp must be recent");
        if (
          b.locationMode === "GPS" &&
          b.lastLocationUpdate &&
          d.timestamp <= b.lastLocationUpdate
        )
          fail(409, "Location must be newer than the previous update");
        await db.batch([
          db
            .prepare(
              "UPDATE buses SET currentLatitude=?,currentLongitude=?,lastLocationUpdate=?,locationMode='GPS' WHERE id=?",
            )
            .bind(d.latitude, d.longitude, d.timestamp, b.id),
          db
            .prepare(
              "INSERT INTO busLocations (id,busId,latitude,longitude,speed,timestamp,mode) VALUES (?,?,?,?,?,?,?)",
            )
            .bind(
              crypto.randomUUID(),
              b.id,
              d.latitude,
              d.longitude,
              d.speed,
              d.timestamp,
              "GPS",
            ),
          db
            .prepare(
              "DELETE FROM busLocations WHERE busId=? AND id NOT IN (SELECT id FROM busLocations WHERE busId=? ORDER BY timestamp DESC LIMIT 99)",
            )
            .bind(b.id, b.id),
        ]);
        return out({ ok: true });
      }
      if (p[2] === "simulate" && method === "POST") {
        if (!demo) fail(404, "Unavailable");
        await ownedBus(p[1]);
        await update("buses", p[1], {
          locationMode: "DEMO",
          lastLocationUpdate: now(),
        });
        return out({ ok: true });
      }
    }
    if (p[0] === "operators" && p[1] === "apply" && method === "POST") {
      const d = schemas.applications.parse(await body());
      await insert("operatorApplications", {
        id: crypto.randomUUID(),
        ...d,
        status: "PENDING",
        createdAt: now(),
      });
      return out(
        {
          message:
            "Application received. Your fleet details are ready for review.",
        },
        201,
      );
    }
    if (p[0] === "contact" && method === "POST") {
      const d = schemas.contact.parse(await body());
      await insert("contactMessages", {
        id: crypto.randomUUID(),
        ...d,
        status: "NEW",
        createdAt: now(),
      });
      return out(
        { message: "Message received. Thank you for reaching out." },
        201,
      );
    }
    if (p[0] === "me") {
      auth();
      if (method === "GET")
        return out({
          user: safeUser(user),
          favouriteRoutes: await all(
            "SELECT r.*,f.id favouriteId FROM favouriteRoutes f JOIN routes r ON r.id=f.routeId WHERE f.userId=?",
            user.id,
          ),
          favouriteStops: await all(
            "SELECT s.*,f.id favouriteId FROM favouriteStops f JOIN stops s ON s.id=f.stopId WHERE f.userId=?",
            user.id,
          ),
          journeys: await all(
            "SELECT * FROM journeys WHERE userId=? ORDER BY searchedAt DESC LIMIT 20",
            user.id,
          ),
          savedPlaces: await all(
            "SELECT p.*,s.stopName FROM savedPlaces p JOIN stops s ON s.id=p.stopId WHERE p.userId=?",
            user.id,
          ),
        });
      if (p[1] === "profile" && method === "PATCH") {
        const d = z.object({ fullName: txt, phone }).parse(await body());
        await update("users", user.id, { ...d, updatedAt: now() });
        return out({ ok: true });
      }
      if (["favouriteRoutes", "favouriteStops", "savedPlaces"].includes(p[1])) {
        const t = p[1];
        if (method === "DELETE") {
          await run(`DELETE FROM ${t} WHERE id=? AND userId=?`, p[2], user.id);
          return out({ ok: true });
        }
        if (method === "POST") {
          const d = (
            t === "favouriteRoutes"
              ? z.object({ routeId: id })
              : t === "favouriteStops"
                ? z.object({ stopId: id })
                : z.object({ stopId: id, label: txt })
          ).parse(await body());
          await insert(t, { id: crypto.randomUUID(), userId: user.id, ...d });
          return out({ ok: true }, 201);
        }
      }
    }
    const audit = async (action: string) =>
      insert("auditLog", {
        id: crypto.randomUUID(),
        userId: user.id,
        action,
        createdAt: now(),
      });
    if (p[0] === "admin" || p[0] === "operator") {
      const isAdmin = p[0] === "admin";
      auth(isAdmin ? ["ADMIN"] : ["OPERATOR", "ADMIN"]);
      const op = await one("SELECT * FROM operators WHERE userId=?", user.id);
      if (
        !isAdmin &&
        user.role !== "ADMIN" &&
        (!op || op.verificationStatus !== "APPROVED")
      )
        fail(403, "Your operator account is awaiting approval or suspended");
      const t = p[1],
        key = p[2];
      if (t === "overview" && method === "GET") {
        if (!isAdmin)
          return out({
            operator: op,
            buses: await all(
              "SELECT * FROM buses WHERE operatorId=?",
              op?.id || "",
            ),
            routes: await all(
              "SELECT r.* FROM operatorRoutes x JOIN routes r ON r.id=x.routeId WHERE x.operatorId=?",
              op?.id || "",
            ),
            activity: await all(
              "SELECT * FROM auditLog WHERE userId=? ORDER BY createdAt DESC LIMIT 10",
              user.id,
            ),
          });
        const counts: any = {};
        for (const table of [
          "users",
          "operators",
          "buses",
          "routes",
          "stops",
          "operatorApplications",
          "contactMessages",
        ])
          counts[table] = (await one(`SELECT COUNT(*) n FROM ${table}`)).n;
        counts.activeBuses = (
          await one(
            "SELECT COUNT(*) n FROM buses WHERE status IN ('ACTIVE','ON_ROUTE','DELAYED')",
          )
        ).n;
        return out(counts);
      }
      if (t === "permissions" && isAdmin) {
        if (method === "GET")
          return out(await all("SELECT * FROM operatorRoutes"));
        const d = z.object({ operatorId: id, routeId: id }).parse(await body());
        if (method === "POST")
          await insert("operatorRoutes", { id: crypto.randomUUID(), ...d });
        if (method === "DELETE")
          await run(
            "DELETE FROM operatorRoutes WHERE operatorId=? AND routeId=?",
            d.operatorId,
            d.routeId,
          );
        return out({ ok: true });
      }
      if (t === "routes" && key && p[3] === "stops") {
        if (!isAdmin) {
          if (
            !op ||
            !(await one(
              "SELECT id FROM operatorRoutes WHERE operatorId=? AND routeId=?",
              op.id,
              key,
            ))
          )
            fail(403, "Route not assigned");
        }
        if (method === "GET") return out((await routeDetail(key)).stops);
        if (method === "PUT") {
          const d = z
            .array(
              z.object({
                stopId: id,
                estimatedOffsetMinutes: num.int().min(0).max(600),
              }),
            )
            .min(2)
            .max(100)
            .parse(await body());
          if (
            new Set(d.map((s) => s.stopId)).size !== d.length ||
            d.some(
              (s, i) =>
                i > 0 &&
                s.estimatedOffsetMinutes <= d[i - 1].estimatedOffsetMinutes,
            )
          )
            fail(400, "Stops must be unique with increasing time offsets");
          const first = await one(
              "SELECT stopName FROM stops WHERE id=?",
              d[0].stopId,
            ),
            last = await one(
              "SELECT stopName FROM stops WHERE id=?",
              d[d.length - 1].stopId,
            );
          if (!first || !last) fail(400, "Unknown stop");
          await db.batch([
            db.prepare("DELETE FROM fares WHERE routeId=?").bind(key),
            db.prepare("DELETE FROM routeStops WHERE routeId=?").bind(key),
            ...d.map((s, i) =>
              db
                .prepare(
                  "INSERT INTO routeStops (id,routeId,stopId,stopOrder,estimatedOffsetMinutes) VALUES (?,?,?,?,?)",
                )
                .bind(
                  crypto.randomUUID(),
                  key,
                  s.stopId,
                  i,
                  s.estimatedOffsetMinutes,
                ),
            ),
            db
              .prepare(
                "UPDATE routes SET source=?,destination=?,estimatedDuration=? WHERE id=?",
              )
              .bind(
                first.stopName,
                last.stopName,
                d[d.length - 1].estimatedOffsetMinutes -
                  d[0].estimatedOffsetMinutes,
                key,
              ),
          ]);
          await audit("Updated stop sequence for " + key);
          return out({ ok: true });
        }
      }
      if (!tables[t]) fail(404, "Resource not found");
      if (!isAdmin && !["buses", "routes", "alerts"].includes(t))
        fail(403, "Admin access required");
      if (method === "GET") {
        if (t === "users")
          return out(
            await all(
              "SELECT id,fullName,email,role,disabled,createdAt FROM users",
            ),
          );
        if (!isAdmin) {
          if (t === "buses")
            return out(
              await all("SELECT * FROM buses WHERE operatorId=?", op?.id || ""),
            );
          if (t === "routes")
            return out(
              await all(
                "SELECT r.* FROM routes r JOIN operatorRoutes x ON x.routeId=r.id WHERE x.operatorId=?",
                op?.id || "",
              ),
            );
          if (t === "alerts")
            return out(
              await all(
                "SELECT a.* FROM serviceAlerts a JOIN operatorRoutes x ON x.routeId=a.routeId WHERE x.operatorId=?",
                op?.id || "",
              ),
            );
        }
        return out(await all(`SELECT * FROM ${tables[t]} LIMIT 500`));
      }
      if (t === "users" && method === "PATCH" && isAdmin) {
        const d = z
          .object({
            disabled: flag.optional(),
            role: z.enum(["PASSENGER", "OPERATOR", "ADMIN"]).optional(),
            confirmRole: z.boolean().optional(),
          })
          .parse(await body());
        if (key === user.id)
          fail(400, "You cannot disable or change your own role");
        if (d.role && !d.confirmRole) fail(400, "Confirm this role change");
        const { confirmRole, ...changes } = d;
        await update("users", key, changes);
        await run("DELETE FROM sessions WHERE userId=?", key);
        await audit("Updated user " + key);
        return out({ ok: true });
      }
      if (t === "applications" && method === "PATCH" && isAdmin) {
        const d = z
            .object({ status: z.enum(["APPROVED", "REJECTED"]) })
            .parse(await body()),
          a = await one("SELECT * FROM operatorApplications WHERE id=?", key);
        if (!a) fail(404, "Application not found");
        if (d.status === "APPROVED") {
          const u = await one("SELECT * FROM users WHERE email=?", a.email);
          if (!u)
            fail(
              409,
              "The applicant must register a passenger account with the same email before approval.",
            );
          if (u.role === "ADMIN")
            fail(
              409,
              "An administrator cannot be converted through an application",
            );
          if (await one("SELECT id FROM operators WHERE userId=?", u.id))
            fail(409, "Operator already exists");
          await db.batch([
            db
              .prepare(
                "UPDATE users SET role='OPERATOR',updatedAt=? WHERE id=?",
              )
              .bind(now(), u.id),
            db
              .prepare(
                "INSERT INTO operators (id,userId,companyName,ownerName,phone,email,city,verificationStatus,gpsAvailable,totalBuses,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
              )
              .bind(
                crypto.randomUUID(),
                u.id,
                a.companyName,
                a.contactPerson,
                a.phone,
                a.email,
                a.city,
                "APPROVED",
                a.gpsAvailable,
                a.numberOfBuses,
                now(),
              ),
            db
              .prepare("UPDATE operatorApplications SET status=? WHERE id=?")
              .bind(d.status, key),
          ]);
        } else await update("operatorApplications", key, d);
        await audit("Reviewed application " + key);
        return out({ ok: true });
      }
      if (t === "operators" && method === "PATCH" && isAdmin) {
        const d = z
          .object({ verificationStatus: z.enum(["APPROVED", "SUSPENDED"]) })
          .parse(await body());
        await update("operators", key, d);
        return out({ ok: true });
      }
      if (t === "contact" && method === "PATCH" && isAdmin) {
        const d = z
          .object({ status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED"]) })
          .parse(await body());
        await update("contactMessages", key, d);
        return out({ ok: true });
      }
      if (!schemas[t]) fail(405, "Operation not supported");
      if (method === "POST" || method === "PATCH") {
        let input = await body();
        if (!isAdmin && t === "buses") input.operatorId = op.id;
        const d = schemas[t].parse(input);
        if (key && !(await one(`SELECT id FROM ${tables[t]} WHERE id=?`, key)))
          fail(404, "Record not found");
        if (!isAdmin) {
          if (t === "buses" && key) await ownedBus(key);
          if (t === "routes") {
            if (!key) fail(403, "Ask an admin to create a route");
            if (
              !(await one(
                "SELECT id FROM operatorRoutes WHERE operatorId=? AND routeId=?",
                op.id,
                key,
              ))
            )
              fail(403, "Route not assigned");
          }
          const routeId = t === "routes" ? key : d.routeId;
          if (
            routeId &&
            !(await one(
              "SELECT id FROM operatorRoutes WHERE operatorId=? AND routeId=?",
              op.id,
              routeId,
            ))
          )
            fail(403, "Route not assigned");
          if (t === "alerts" && !routeId)
            fail(400, "Choose one of your assigned routes");
          if (t === "alerts" && key) {
            const old = await one(
              "SELECT routeId FROM serviceAlerts WHERE id=?",
              key,
            );
            if (
              !(await one(
                "SELECT id FROM operatorRoutes WHERE operatorId=? AND routeId=?",
                op.id,
                old.routeId,
              ))
            )
              fail(403, "Alert not in your routes");
          }
        }
        if (
          t === "buses" &&
          d.routeId &&
          !(await one(
            "SELECT id FROM operatorRoutes WHERE operatorId=? AND routeId=?",
            d.operatorId,
            d.routeId,
          ))
        )
          fail(400, "Grant the operator access to this route first");
        if (t === "alerts" && d.busId) {
          const b = await one("SELECT routeId FROM buses WHERE id=?", d.busId);
          if (!b || b.routeId !== d.routeId)
            fail(400, "Bus must belong to the selected route");
        }
        if (t === "alerts" && d.endsAt && d.endsAt <= d.startsAt)
          fail(400, "Alert end must follow its start");
        if (t === "fares") {
          const a = await one(
              "SELECT stopOrder FROM routeStops WHERE routeId=? AND stopId=?",
              d.routeId,
              d.sourceStopId,
            ),
            b = await one(
              "SELECT stopOrder FROM routeStops WHERE routeId=? AND stopId=?",
              d.routeId,
              d.destinationStopId,
            );
          if (!a || !b || a.stopOrder >= b.stopOrder)
            fail(400, "Fare must follow the route stop sequence");
        }
        if (method === "POST") {
          await insert(tables[t], {
            id: crypto.randomUUID(),
            ...d,
            ...(["routes", "buses"].includes(t) ? { createdAt: now() } : {}),
          });
        } else await update(tables[t], key, d);
        await audit(`${method} ${t} ${key || ""}`);
        return out({ ok: true }, method === "POST" ? 201 : 200);
      }
      if (method === "DELETE" && isAdmin && key) {
        if (["routes", "stops", "alerts", "passes"].includes(t))
          await update(tables[t], key, { active: 0 });
        else if (t === "buses")
          await update("buses", key, { status: "INACTIVE" });
        else if (t === "fares") await run("DELETE FROM fares WHERE id=?", key);
        else fail(405, "Disable this record instead");
        await audit("Disabled " + t + " " + key);
        return out({ ok: true });
      }
    }
    if (p[0] === "payments")
      return out(
        {
          available: false,
          message: "Payments are not enabled. No money has been charged.",
        },
        503,
      );
    return out({ error: "Endpoint not found" }, 404);
  } catch (e: any) {
    if (e instanceof z.ZodError)
      return out(
        {
          error: e.issues
            .map((i: any) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        },
        400,
      );
    if (e instanceof ApiError) return out({ error: e.message }, e.status);
    const s = String(e.message);
    if (s.includes("UNIQUE constraint"))
      return out({ error: "This record already exists." }, 409);
    if (s.includes("FOREIGN KEY"))
      return out({ error: "Please select valid related records." }, 400);
    console.error("CITYBUS API failure", s);
    return out({ error: "Something went wrong. Please try again." }, 500);
  }
}
