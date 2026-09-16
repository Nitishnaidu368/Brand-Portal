import "server-only";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { ADMIN_SESSION_DAYS, SECURE_COOKIES } from "@/lib/config";
import { db } from "@/lib/db";
import { admins, agencies, portals } from "@/lib/db/schema";
import { createSession, deleteSession, findSession } from "./session";

export const ADMIN_COOKIE = "bp_admin";

export const getCurrentAdmin = cache(async () => {
  const store = await cookies();
  const session = await findSession(store.get(ADMIN_COOKIE)?.value);
  if (!session || session.kind !== "admin" || !session.adminId) return null;

  const [row] = await db
    .select({ admin: admins, agency: agencies })
    .from(admins)
    .innerJoin(agencies, eq(admins.agencyId, agencies.id))
    .where(eq(admins.id, session.adminId))
    .limit(1);
  if (!row) return null;

  return {
    id: row.admin.id,
    name: row.admin.name,
    email: row.admin.email,
    agencyId: row.agency.id,
    agencyName: row.agency.name,
  };
});

export type CurrentAdmin = NonNullable<Awaited<ReturnType<typeof getCurrentAdmin>>>;

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  return admin;
}

export async function hasAnyAdmin() {
  const row = await db.select({ id: admins.id }).from(admins).limit(1);
  return row.length > 0;
}

export async function startAdminSession(adminId: string) {
  const { token, expiresAt } = await createSession({ kind: "admin", adminId }, ADMIN_SESSION_DAYS);
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: SECURE_COOKIES,
    path: "/",
    expires: expiresAt,
  });
}

export async function endAdminSession() {
  const store = await cookies();
  await deleteSession(store.get(ADMIN_COOKIE)?.value);
  store.delete(ADMIN_COOKIE);
}

export async function findOwnedPortal(admin: CurrentAdmin, portalId: string) {
  const portal = await db.query.portals.findFirst({
    where: and(eq(portals.id, portalId), eq(portals.agencyId, admin.agencyId)),
  });
  return portal ?? null;
}

export async function requireOwnedPortal(portalId: string) {
  const admin = await requireAdmin();
  const portal = await findOwnedPortal(admin, portalId);
  if (!portal) notFound();
  return { admin, portal };
}
