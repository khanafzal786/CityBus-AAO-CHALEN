import express from "express";
import helmet from "helmet";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { handle } from "../api";
import { database } from "./database";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const app = express();
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
      },
    },
  }),
);
app.use(express.text({ type: "application/json", limit: "20kb" }));
const env = {
  DB: database(
    process.env.SQLITE_PATH || resolve(root, "citybus.sqlite"),
    resolve(root, "drizzle"),
  ),
  DEMO_MODE: process.env.DEMO_MODE || "false",
};
app.use("/api", async (req: any, res: any) => {
  try {
    const origin =
      process.env.PUBLIC_ORIGIN ||
      `http://localhost:${process.env.PORT || 3001}`;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value && key !== "content-length")
        headers.set(
          key,
          Array.isArray(value) ? value.join(",") : String(value),
        );
    }
    headers.set("cf-connecting-ip", req.socket.remoteAddress || "local");
    const r = await handle(
      new Request(origin + req.originalUrl, {
        method: req.method,
        headers,
        body: ["GET", "HEAD"].includes(req.method)
          ? undefined
          : req.body || "{}",
      }),
      env,
    );
    res.status(r.status);
    r.headers.forEach((v, k) => res.setHeader(k, v));
    res.send(await r.text());
  } catch {
    res.status(500).json({ error: "Server unavailable" });
  }
});
app.use(express.static(resolve(root, "standalone-dist")));
app.use((req: any, res: any) => res.status(404).json({ error: "Not found" }));
app.use((error: any, req: any, res: any, next: any) =>
  res
    .status(error.status === 413 ? 413 : 500)
    .json({
      error: error.status === 413 ? "Request too large" : "Server unavailable",
    }),
);
export const server = app.listen(
  Number(process.env.PORT || 3001),
  process.env.HOST || "127.0.0.1",
  () =>
    console.log(
      "CITYBUS Express listening on port " + (process.env.PORT || 3001),
    ),
);
