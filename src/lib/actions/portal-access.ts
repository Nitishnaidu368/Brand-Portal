"use server";

import { and, eq, gt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, formFields, zodFail, type ActionState } from "@/lib/action-state";
import { hashPassword, MIN_PASSWORD_LENGTH, sha256, verifyPassword } from "@/lib/auth/password";
import { endPortalSession, getPortalBySlug, startPortalSession } from "@/lib/auth/portal";
import {
  clearFailedAttempts,
  clientIp,
  isRateLimited,
  RATE_LIMIT_MESSAGE,
  recordFailedAttempt,
} from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { portalUsers } from "@/lib/db/schema";

const UNAVAILABLE = fail("This portal isn't available right now.");

async function publishedPortal(slug: string | undefined) {
  if (!slug) return null;
  const portal = await getPortalBySlug(slug);
  return portal?.isPublished ? portal : null;
}

export async function portalPasswordLoginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const portal = await publishedPortal(fields.slug);
  if (!portal || portal.accessMode !== "password") return UNAVAILABLE;

  const limitKey = `portal:${portal.id}:${await clientIp()}`;
  if (await isRateLimited(limitKey)) return fail(RATE_LIMIT_MESSAGE);

  if (!(await verifyPassword(fields.password ?? "", portal.passwordHash))) {
    await recordFailedAttempt(limitKey);
    return fail("That password isn't right.");
  }

  await clearFailedAttempts(limitKey);
  await startPortalSession(portal.id, null);
  redirect(`/p/${portal.slug}`);
}

export async function portalEmailLoginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const portal = await publishedPortal(fields.slug);
  if (!portal || portal.accessMode !== "email") return UNAVAILABLE;

  const limitKey = `portal:${portal.id}:${await clientIp()}`;
  if (await isRateLimited(limitKey)) return fail(RATE_LIMIT_MESSAGE);

  const email = (fields.email ?? "").trim().toLowerCase();
  const user = await db.query.portalUsers.findFirst({
    where: and(eq(portalUsers.portalId, portal.id), eq(portalUsers.email, email)),
  });
  if (!user || !(await verifyPassword(fields.password ?? "", user.passwordHash))) {
    await recordFailedAttempt(limitKey);
    return fail("That email and password don't match.");
  }

  await clearFailedAttempts(limitKey);
  await db.update(portalUsers).set({ lastLoginAt: new Date() }).where(eq(portalUsers.id, user.id));
  await startPortalSession(portal.id, user.id);
  redirect(`/p/${portal.slug}`);
}

const acceptSchema = z
  .object({
    name: z.string().trim().max(80).default(""),
    password: z.string().min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`).max(200),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

export async function acceptInviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const portal = await publishedPortal(fields.slug);
  if (!portal || portal.accessMode !== "email") return UNAVAILABLE;

  const user = await db.query.portalUsers.findFirst({
    where: and(
      eq(portalUsers.portalId, portal.id),
      eq(portalUsers.inviteTokenHash, sha256(fields.token ?? "")),
      gt(portalUsers.inviteExpiresAt, new Date()),
    ),
  });
  if (!user) return fail("This invite link has expired. Ask for a new one.");

  const parsed = acceptSchema.safeParse(fields);
  if (!parsed.success) return zodFail(parsed.error);

  await db
    .update(portalUsers)
    .set({
      name: parsed.data.name || user.name,
      passwordHash: await hashPassword(parsed.data.password),
      inviteTokenHash: null,
      inviteExpiresAt: null,
      lastLoginAt: new Date(),
    })
    .where(eq(portalUsers.id, user.id));
  await startPortalSession(portal.id, user.id);
  redirect(`/p/${portal.slug}`);
}

export async function portalLogoutAction(formData: FormData) {
  const slug = formData.get("slug");
  const portal = typeof slug === "string" ? await getPortalBySlug(slug) : null;
  if (portal) await endPortalSession(portal.id);
  redirect(portal ? `/p/${portal.slug}/login` : "/");
}
