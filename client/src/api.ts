export async function api(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<any> {
  const r = await fetch("/api/" + path, {
    method,
    credentials: "same-origin",
    headers:
      method !== "GET" ? { "Content-Type": "application/json" } : undefined,
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  let d: any;
  try {
    d = await r.json();
  } catch {
    throw new Error("The server is unavailable. Please try again.");
  }
  if (!r.ok) throw new Error(d.error || d.message || "Request failed");
  return d;
}
