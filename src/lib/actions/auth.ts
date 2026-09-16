"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, formFields, zodFail, type ActionState } from "@/lib/action-state";
import { endAdminSession, hasAnyAdmin, startAdminSession } from "@/lib/auth/admin";
import { hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from "@/lib/auth/password";
import {
  clearFailedAttempts,
  clientIp,
  isRateLimited,
  RATE_LIMIT_MESSAGE,
  recordFailedAttempt,
} from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { admins, agencies } from "@/lib/db/schema";
import { newId } from "@/lib/utils";
import { emailSchema } from "./guards";

const setupSchema = z.object({
  agencyName: z.string().trim().min(1, "Enter your studio or agency name").max(80),
  name: z.string().trim().min(1, "Enter your name").max(80),
  email: emailSchema,
  password: z.string().min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`).max(200),
});

export async function setupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (await hasAnyAdmin()) return fail("Setup is already complete. Sign in instead.");
  const parsed = setupSchema.safeParse(formFields(formData));
  if (!parsed.success) return zodFail(parsed.error);

  const { agencyName, name, email, password } = parsed.data;
  const agencyId = newId();
  const adminId = newId();
  const passwordHash = await hashPassword(password);
  await db.batch([
    db.insert(agencies).values({ id: agencyId, name: agencyName }),
    db.insert(admins).values({ id: adminId, agencyId, email, name, passwordHash }),
  ]);
  await startAdminSession(adminId);
  redirect("/dashboard");
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string().max(200),
});

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formFields(formData));
  if (!parsed.success) return fail("Enter your email and password.");

  const limitKey = `admin:${await clientIp()}`;
  if (await isRateLimited(limitKey)) return fail(RATE_LIMIT_MESSAGE);

  const admin = await db.query.admins.findFirst({ where: eq(admins.email, parsed.data.email) });
  const valid = await verifyPassword(parsed.data.password, admin?.passwordHash);
  if (!admin || !valid) {
    await recordFailedAttempt(limitKey);
    return fail("That email and password don't match.");
  }

  await clearFailedAttempts(limitKey);
  await startAdminSession(admin.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await endAdminSession();
  redirect("/login");
}
