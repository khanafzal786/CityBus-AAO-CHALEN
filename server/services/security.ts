import {
  scryptSync,
  timingSafeEqual,
  randomBytes,
  createHash,
} from "node:crypto";
export function hashPassword(p: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(p, salt, 64).toString("hex")}`;
}
export function verifyPassword(p: string, hash: string) {
  try {
    const [a, s, h] = hash.split(":");
    if (a !== "scrypt") return false;
    return timingSafeEqual(scryptSync(p, s, 64), Buffer.from(h, "hex"));
  } catch {
    return false;
  }
}
export function token() {
  return randomBytes(32).toString("hex");
}
export function digest(s: string) {
  return createHash("sha256").update(s).digest("hex");
}
export function distance(a: number, b: number, c: number, d: number) {
  const r = Math.PI / 180,
    dl = (c - a) * r,
    dn = (d - b) * r;
  return (
    6371 *
    2 *
    Math.atan2(
      Math.sqrt(
        Math.sin(dl / 2) ** 2 +
          Math.cos(a * r) * Math.cos(c * r) * Math.sin(dn / 2) ** 2,
      ),
      Math.sqrt(
        1 -
          (Math.sin(dl / 2) ** 2 +
            Math.cos(a * r) * Math.cos(c * r) * Math.sin(dn / 2) ** 2),
      ),
    )
  );
}
