import { describe, expect, it } from "vitest";
import { isAdminPasswordCorrect } from "./admin";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const testPasswords = (process.env.PSEC_ADMIN_PASSWORDS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (testPasswords.length === 0) {
  testPasswords.push(
    ...Array.from({ length: 7 }, (_, index) => `test-admin-password-${index}-${Math.random().toString(36).slice(2)}`),
  );
  process.env.PSEC_ADMIN_PASSWORDS = testPasswords.join(",");
}

describe("PSEC admin secret configuration", () => {
  it("contains seven working credentials and rejects an invalid password", () => {
    const configured = testPasswords;

    expect(configured).toHaveLength(7);
    for (const password of configured) {
      expect(isAdminPasswordCorrect(password)).toBe(true);
    }
    expect(isAdminPasswordCorrect("definitely-not-an-admin-password")).toBe(false);

    // Differential checks. The expected accept/reject pair must both use a real
    // configured value so the comparison is meaningful. Never inline a literal
    // credential here: this file is tracked, and a literal would publish the
    // value and the naming pattern of a working administrator password.
    const [knownGood] = configured;
    expect(knownGood).toBeTruthy();
    expect(isAdminPasswordCorrect(knownGood)).toBe(true);
    expect(isAdminPasswordCorrect(`${knownGood}-not-the-configured-value`)).toBe(false);
    expect(isAdminPasswordCorrect(knownGood.slice(0, -1) || "x")).toBe(false);
  });

  it("accepts every configured credential through the admin login procedure", async () => {
    const configured = testPasswords;
    const ctx: TrpcContext = {
      user: undefined,
      req: { protocol: "https", headers: {}, ip: "admin-secret-test" } as TrpcContext["req"],
      res: { cookie: () => undefined } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    for (const password of configured) {
      await expect(caller.admin.login({ password })).resolves.toEqual({ success: true });
    }
  });
});
