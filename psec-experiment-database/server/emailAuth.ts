import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import nodemailer from "nodemailer";
import { and, desc, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { emailLoginCodes } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { getDb, getUserByOpenId, upsertUser } from "./db";
import { schoolEmailOpenId } from "./emailIdentity";

const CODE_TTL_MS = 10 * 60 * 1000;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;
const REQUEST_LIMIT = 3;
const MAX_VERIFY_ATTEMPTS = 5;
const requestAttempts = new Map<string, { count: number; windowStartedAt: number }>();

export function normalizeSchoolEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isSchoolEmail(value: string) {
  const email = normalizeSchoolEmail(value);
  const suffix = `@${ENV.schoolEmailDomain}`;
  return email.endsWith(suffix) && email.length > suffix.length && email.includes("@");
}

function codeHash(email: string, code: string) {
  return createHash("sha256").update(`${ENV.cookieSecret}:${email}:${code}`, "utf8").digest("hex");
}

function requestKey(email: string, ip: string) {
  return `${email}:${ip}`;
}

function assertRequestLimit(email: string, ip: string) {
  const key = requestKey(email, ip);
  const now = Date.now();
  const current = requestAttempts.get(key);
  if (!current || now - current.windowStartedAt >= REQUEST_WINDOW_MS) {
    requestAttempts.set(key, { count: 1, windowStartedAt: now });
    return;
  }
  if (current.count >= REQUEST_LIMIT) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many code requests. Please try again later." });
  }
  current.count += 1;
}

function getTransporter() {
  if (!ENV.smtpHost || !ENV.smtpUser || !ENV.smtpPassword || !ENV.smtpFrom) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Email service is not configured." });
  }
  return nodemailer.createTransport({
    host: ENV.smtpHost,
    port: ENV.smtpPort,
    secure: ENV.smtpPort === 465,
    auth: { user: ENV.smtpUser, pass: ENV.smtpPassword },
  });
}

export async function requestEmailCode(input: { email: string; ip: string }) {
  const email = normalizeSchoolEmail(input.email);
  if (!isSchoolEmail(email)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Use your @${ENV.schoolEmailDomain} school email.` });
  }
  assertRequestLimit(email, input.ip);

  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not configured." });

  const code = randomInt(100000, 1000000).toString();
  await db.insert(emailLoginCodes).values({
    email,
    codeHash: codeHash(email, code),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
    requestedIp: input.ip.slice(0, 64),
  });

  await getTransporter().sendMail({
    from: ENV.smtpFrom,
    to: email,
    subject: "Your PSEC sign-in code",
    text: `Your PSEC sign-in code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
  });

  return { success: true as const };
}

export async function verifyEmailCode(input: { email: string; code: string }) {
  const email = normalizeSchoolEmail(input.email);
  if (!isSchoolEmail(email) || !/^\d{6}$/.test(input.code)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The email or code is invalid." });
  }

  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not configured." });
  const current = (await db.select().from(emailLoginCodes).where(and(eq(emailLoginCodes.email, email), isNull(emailLoginCodes.usedAt))).orderBy(desc(emailLoginCodes.createdAt)).limit(1))[0];

  if (!current || current.expiresAt.getTime() <= Date.now()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "That code has expired. Request a new code." });
  }
  if (current.attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many incorrect codes. Request a new code." });
  }

  await db.update(emailLoginCodes).set({ attempts: current.attempts + 1 }).where(eq(emailLoginCodes.id, current.id));
  const expected = Buffer.from(current.codeHash, "utf8");
  const supplied = Buffer.from(codeHash(email, input.code), "utf8");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "That code is incorrect." });
  }

  await db.update(emailLoginCodes).set({ usedAt: new Date() }).where(eq(emailLoginCodes.id, current.id));
  const openId = schoolEmailOpenId(email);
  const existing = await getUserByOpenId(openId);
  await upsertUser({
    openId,
    email,
    name: existing?.name || email.slice(0, email.indexOf("@")),
    loginMethod: "school-email",
    lastSignedIn: new Date(),
  });
  return { openId, name: existing?.name || email.slice(0, email.indexOf("@")), email };
}
