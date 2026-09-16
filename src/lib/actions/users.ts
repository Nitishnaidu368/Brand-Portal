"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { fail, formFields, ok, zodFail, type ActionState } from "@/lib/action-state";
import { randomToken, sha256 } from "@/lib/auth/password";
import { INVITE_DAYS } from "@/lib/config";
import { db } from "@/lib/db";
import { portalUsers } from "@/lib/db/schema";
import { newId } from "@/lib/utils";
import { authorizePortal, DENIED, emailSchema, refreshAll } from "./guards";

async function appOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

const inviteSchema = z.object({
  email: emailSchema,
  name: z.string().trim().max(80).default(""),
});

/**
 * Creates a client login (or refreshes an existing one) and returns a one-time link where the
 * client sets their password. The link doubles as a password reset for existing users.
 */
export async function inviteUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizePortal(fields.portalId);
  if (!auth) return DENIED;
  const parsed = inviteSchema.safeParse(fields);
  if (!parsed.success) return zodFail(parsed.error);
  const { email, name } = parsed.data;

  const token = randomToken();
  const invite = {
    inviteTokenHash: sha256(token),
    inviteExpiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
  };

  const existing = await db.query.portalUsers.findFirst({
    where: and(eq(portalUsers.portalId, auth.portal.id), eq(portalUsers.email, email)),
  });
  if (existing) {
    await db
      .update(portalUsers)
      .set({ ...invite, ...(name ? { name } : {}) })
      .where(eq(portalUsers.id, existing.id));
  } else {
    await db.insert(portalUsers).values({ id: newId(), portalId: auth.portal.id, email, name, ...invite });
  }

  refreshAll();
  const inviteUrl = `${await appOrigin()}/p/${auth.portal.slug}/invite/${token}`;
  return ok(existing?.passwordHash ? "Password reset link created" : "Invite link created", { inviteUrl, email });
}

export async function removeUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizePortal(fields.portalId);
  if (!auth) return DENIED;
  if (!fields.userId) return fail("Unknown user.");

  // Sessions for this user cascade away with the row.
  await db
    .delete(portalUsers)
    .where(and(eq(portalUsers.id, fields.userId), eq(portalUsers.portalId, auth.portal.id)));
  refreshAll();
  return ok();
}
