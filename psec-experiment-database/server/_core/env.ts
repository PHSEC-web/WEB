import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";

/** Find the package root so the app does not depend on systemd's cwd. */
function findPackageRoot(startDirectory: string): string | undefined {
  let directory = path.resolve(startDirectory);
  while (true) {
    if (existsSync(path.join(directory, "package.json"))) return directory;
    const parent = path.dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}

/**
 * Resolve the environment file used by the server entrypoint.
 *
 * The source entrypoint lives under `server/_core`, while the bundled
 * entrypoint lives under `dist`; both resolve to the same nearest package
 * root. The cwd fallback keeps standalone artifacts usable when package.json
 * is not copied alongside dist.
 */
export function resolveEnvironmentFile(
  moduleDirectory = path.dirname(fileURLToPath(import.meta.url)),
  currentDirectory = process.cwd(),
): string | undefined {
  const packageRoot = findPackageRoot(moduleDirectory);
  const candidates = [
    packageRoot && path.join(packageRoot, ".env"),
    path.join(moduleDirectory, ".env"),
    path.resolve(moduleDirectory, "..", ".env"),
    path.resolve(currentDirectory, ".env"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  return Array.from(new Set(candidates)).find(candidate => existsSync(candidate));
}

function loadEnvironmentFile() {
  const environmentFile = resolveEnvironmentFile();
  if (!environmentFile) return;

  const result = loadDotenv({ path: environmentFile, quiet: true });
  if (result.error) {
    // Do not include the path or parsed values in startup logs.
    throw new Error("Unable to load the server environment file");
  }
}

loadEnvironmentFile();

export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerEmail: (process.env.OWNER_EMAIL ?? "").trim().toLowerCase(),
  schoolEmailDomain: (process.env.SCHOOL_EMAIL_DOMAIN ?? "shphschool.com").trim().toLowerCase(),
  isProduction: process.env.NODE_ENV === "production",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? "587"),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPassword: process.env.SMTP_PASSWORD ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "",
  ossRegion: (process.env.OSS_REGION ?? "").trim(),
  ossBucket: (process.env.OSS_BUCKET ?? "").trim(),
  ossAccessKeyId: (process.env.OSS_ACCESS_KEY_ID ?? "").trim(),
  ossAccessKeySecret: (process.env.OSS_ACCESS_KEY_SECRET ?? "").trim(),
};

export function validateProductionEnv() {
  if (!ENV.isProduction) return;

  const required = [
    ["DATABASE_URL", ENV.databaseUrl],
    ["JWT_SECRET", ENV.cookieSecret],
    ["PSEC_ADMIN_PASSWORDS", process.env.PSEC_ADMIN_PASSWORDS ?? ""],
    ["OWNER_EMAIL", ENV.ownerEmail],
    ["SMTP_HOST", ENV.smtpHost],
    ["SMTP_USER", ENV.smtpUser],
    ["SMTP_PASSWORD", ENV.smtpPassword],
    ["SMTP_FROM", ENV.smtpFrom],
    ["OSS_REGION", ENV.ossRegion],
    ["OSS_BUCKET", ENV.ossBucket],
    ["OSS_ACCESS_KEY_ID", ENV.ossAccessKeyId],
    ["OSS_ACCESS_KEY_SECRET", ENV.ossAccessKeySecret],
  ] as const;

  const missing = required
    .filter(([, value]) => value.trim().length === 0)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(", ")}`,
    );
  }

  if (ENV.cookieSecret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters in production");
  }

  if (!Number.isInteger(ENV.smtpPort) || ENV.smtpPort < 1 || ENV.smtpPort > 65535) {
    throw new Error("SMTP_PORT must be a valid TCP port in production");
  }
}
