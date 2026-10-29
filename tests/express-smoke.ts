import assert from "node:assert/strict";
process.env.PORT = "0";
process.env.SQLITE_PATH = ":memory:";
process.env.DEMO_MODE = "true";
const { server } = await import("../server/node/index");
await new Promise<void>((resolve) =>
  server.listening ? resolve() : server.once("listening", resolve),
);
const address = server.address() as any;
const base = `http://127.0.0.1:${address.port}`;
try {
  const health = await fetch(base + "/api/health");
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);
  const r = await fetch(base + "/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fullName: "Smoke Test",
      email: "smoke@example.test",
      phone: "",
      password: "LocalTestOnly123",
      confirmPassword: "LocalTestOnly123",
    }),
  });
  assert.equal(r.status, 200);
  const cookie = r.headers.get("set-cookie")!.split(";")[0];
  const profile = await fetch(base + "/api/me", { headers: { cookie } });
  assert.equal(profile.status, 200);
  assert.equal((await profile.json()).user.fullName, "Smoke Test");
  assert.equal(
    (await fetch(base + "/api/admin/users", { headers: { cookie } })).status,
    403,
  );
  const contact = await fetch(base + "/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "QA",
      email: "qa@example.test",
      phone: "",
      subject: "Test",
      message: "A test message",
    }),
  });
  assert.equal(contact.status, 201);
  const home = await fetch(base + "/");
  assert.equal(home.status, 200);
  assert.match(await home.text(), /CITYBUS/);
  console.log(
    "Express smoke: health, password registration, session, role restriction, contact persistence and built asset serving PASSED.",
  );
} finally {
  server.close();
}
