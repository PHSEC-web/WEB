import { createHash } from "node:crypto";

export function schoolEmailOpenId(email: string) {
  return `email:${createHash("sha256").update(email, "utf8").digest("hex").slice(0, 58)}`;
}
