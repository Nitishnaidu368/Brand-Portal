import "server-only";
import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { loginAttempts } from "@/lib/db/schema";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export async function isRateLimited(key: string) {
  const row = await db.query.loginAttempts.findFirst({ where: eq(loginAttempts.key, key) });
  if (!row || Date.now() - row.windowStart.getTime() > WINDOW_MS) return false;
  return row.count >= MAX_FAILURES;
}

export async function recordFailedAttempt(key: string) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - WINDOW_MS).toISOString();
  await db.insert(loginAttempts).values({ key, count: 1, windowStart: now }).onConflictDoUpdate({
    target: loginAttempts.key,
    set: {
      count: sql`case when ${loginAttempts.windowStart} < ${cutoff}::timestamptz then 1 else ${loginAttempts.count} + 1 end`,
      windowStart: sql`case when ${loginAttempts.windowStart} < ${cutoff}::timestamptz then ${now.toISOString()}::timestamptz else ${loginAttempts.windowStart} end`,
    },
  });
}

export async function clearFailedAttempts(key: string) {
  await db.delete(loginAttempts).where(eq(loginAttempts.key, key));
}

export const RATE_LIMIT_MESSAGE = "Too many attempts. Please wait 15 minutes and try again.";
