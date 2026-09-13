import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("production storage configuration", () => {
  it("resolves the project .env without relying on the process cwd", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "psec-env-test-"));
    const moduleDirectory = path.join(root, "server", "_core");
    const unrelatedDirectory = path.join(root, "unrelated");
    mkdirSync(moduleDirectory, { recursive: true });
    mkdirSync(unrelatedDirectory, { recursive: true });
    writeFileSync(path.join(root, "package.json"), "{}\n");
    const environmentFile = path.join(root, ".env");
    writeFileSync(environmentFile, "# test fixture\n");

    try {
      const { resolveEnvironmentFile } = await import("./_core/env");
      expect(resolveEnvironmentFile(moduleDirectory, unrelatedDirectory)).toBe(
        environmentFile,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("accepts a complete production OSS configuration", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "mysql://example");
    vi.stubEnv("JWT_SECRET", "x".repeat(32));
    vi.stubEnv("PSEC_ADMIN_PASSWORDS", "test-only-password");
    vi.stubEnv("OWNER_EMAIL", "owner@example.com");
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("SMTP_USER", "sender@example.com");
    vi.stubEnv("SMTP_PASSWORD", "test-only-password");
    vi.stubEnv("SMTP_FROM", "sender@example.com");
    vi.stubEnv("OSS_REGION", " oss-ap-southeast-5 ");
    vi.stubEnv("OSS_BUCKET", " private-bucket ");
    vi.stubEnv("OSS_ACCESS_KEY_ID", " test-id ");
    vi.stubEnv("OSS_ACCESS_KEY_SECRET", " test-secret ");

    const { ENV, validateProductionEnv } = await import("./_core/env");
    expect(ENV.ossRegion).toBe("oss-ap-southeast-5");
    expect(ENV.ossBucket).toBe("private-bucket");
    expect(validateProductionEnv).not.toThrow();
  });

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

  it("does not require OSS settings during local development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { validateProductionEnv } = await import("./_core/env");
    expect(validateProductionEnv).not.toThrow();
  });
});
