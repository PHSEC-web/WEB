import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("production storage configuration", () => {
  it("refuses to start without the four OSS settings", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "mysql://example");
    vi.stubEnv("JWT_SECRET", "x".repeat(32));
    vi.stubEnv("PSEC_ADMIN_PASSWORDS", "example-password");
    vi.stubEnv("OWNER_EMAIL", "owner@example.com");
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("SMTP_USER", "sender@example.com");
    vi.stubEnv("SMTP_PASSWORD", "example-password");
    vi.stubEnv("SMTP_FROM", "sender@example.com");
    for (const name of ["OSS_REGION", "OSS_BUCKET", "OSS_ACCESS_KEY_ID", "OSS_ACCESS_KEY_SECRET"]) {
      vi.stubEnv(name, "");
    }
    const { validateProductionEnv } = await import("./_core/env");
    expect(validateProductionEnv).toThrow(
      "Missing required production environment variables: OSS_REGION, OSS_BUCKET, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET",
    );
  });
});
