import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { parse } from "cookie";
import type { Request, Response } from "express";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { publicProcedure } from "./_core/trpc";

export const ADMIN_COOKIE = "psec_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_FAILURES = 5;
const fallbackSecret = randomBytes(32).toString("hex");
const loginAttempts = new Map<string, { failures: number; windowStartedAt: number }>();

function sessionSecret() {
  return ENV.cookieSecret || fallbackSecret;
}

function passwordHash(password: string) {
  const normalized = password.trim().replace(/[‐‑‒–—―−]/g, "-");
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

function signature(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

function createToken() {
  const payload = `${Date.now()}.${Math.random().toString(36).slice(2)}`;
  return `${payload}.${signature(payload)}`;
}

export function isAdminPasswordCorrect(password: string) {
  const configured = (process.env.PSEC_ADMIN_PASSWORDS || "").split(",").map((item) => item.trim()).filter(Boolean);
  const supplied = Buffer.from(passwordHash(password));
  return configured.some((candidate) => {
    const expected = Buffer.from(passwordHash(candidate));
    return expected.length === supplied.length && timingSafeEqual(expected, supplied);
  });
}

function requestKey(req: Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function assertAdminLoginAllowed(req: Request) {
  const key = requestKey(req);
  const attempt = loginAttempts.get(key);
  if (!attempt) return;
  if (Date.now() - attempt.windowStartedAt >= LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return;
  }
  if (attempt.failures >= MAX_LOGIN_FAILURES) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many incorrect password attempts. Try again in 15 minutes." });
  }
}

export function recordAdminLoginAttempt(req: Request, successful: boolean) {
  const key = requestKey(req);
  if (successful) {
    loginAttempts.delete(key);
    return;
  }
  const current = loginAttempts.get(key);
  if (!current || Date.now() - current.windowStartedAt >= LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { failures: 1, windowStartedAt: Date.now() });
    return;
  }
  current.failures += 1;
}

export function getAdminToken(req: Request) {
  const cookies = parse(req.headers.cookie || "");
  return cookies[ADMIN_COOKIE];
}

export function isAdminSession(req: Request) {
  const token = getAdminToken(req);
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const tokenTime = Number(parts[0]);
  if (!Number.isFinite(tokenTime) || Date.now() - tokenTime > SESSION_TTL_MS || Date.now() < tokenTime) return false;
  const expected = signature(payload);
  const provided = Buffer.from(parts[2]);
  const actual = Buffer.from(expected);
  return provided.length === actual.length && timingSafeEqual(provided, actual);
}

export function setAdminSession(res: Response, req: Request) {
  res.cookie(ADMIN_COOKIE, createToken(), { ...getSessionCookieOptions(req), maxAge: SESSION_TTL_MS });
}

export function clearAdminSession(res: Response, req: Request) {
  res.clearCookie(ADMIN_COOKIE, getSessionCookieOptions(req));
}

export const adminProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!isAdminSession(ctx.req)) throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin password required" });
  return next({ ctx: { ...ctx, admin: true as const } });
});
