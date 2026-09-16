import "server-only";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { PORTAL_SESSION_DAYS, SECURE_COOKIES } from "@/lib/config";
import { db } from "@/lib/db";
import { portals, portalUsers, sessions, type Portal } from "@/lib/db/schema";
import { getCurrentAdmin } from "./admin";
import { createSession, deleteSession, findSession } from "./session";

export type PortalViewer =
  | { kind: "admin"; label: string }
  | { kind: "client"; label: string; portalUserId: string | null };

export function portalCookieName(portalId: string) {
  return `bp_portal_${portalId.replace(/-/g, "")}`;
}

export async function getPortalBySlug(slug: string) {
  return (await db.query.portals.findFirst({ where: eq(portals.slug, slug) })) ?? null;
}

export async function getPortalById(portalId: string) {
  return (await db.query.portals.findFirst({ where: eq(portals.id, portalId) })) ?? null;
}

/**
 * Who is looking at this portal? Agency admins can always preview it. Clients need a valid
 * session that matches the portal's current access mode, and the portal must be published.
 */
export async function getPortalViewer(portal: Portal): Promise<PortalViewer | null> {
  const admin = await getCurrentAdmin();
  if (admin && admin.agencyId === portal.agencyId) return { kind: "admin", label: "Admin preview" };
  if (!portal.isPublished) return null;

  const store = await cookies();
  const session = await findSession(store.get(portalCookieName(portal.id))?.value);
  if (!session || session.kind !== "portal" || session.portalId !== portal.id) return null;

  if (portal.accessMode === "password") {
    return session.portalUserId ? null : { kind: "client", label: "Shared password", portalUserId: null };
  }
  if (!session.portalUserId) return null;
  const user = await db.query.portalUsers.findFirst({
    where: and(eq(portalUsers.id, session.portalUserId), eq(portalUsers.portalId, portal.id)),
  });
  return user ? { kind: "client", label: user.email, portalUserId: user.id } : null;
}

export async function startPortalSession(portalId: string, portalUserId: string | null) {
  const { token, expiresAt } = await createSession({ kind: "portal", portalId, portalUserId }, PORTAL_SESSION_DAYS);
  (await cookies()).set(portalCookieName(portalId), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: SECURE_COOKIES,
    path: "/",
    expires: expiresAt,
  });
}

export async function endPortalSession(portalId: string) {
  const store = await cookies();
  const name = portalCookieName(portalId);
  await deleteSession(store.get(name)?.value);
  store.delete(name);
}

/** Sign every client out of a portal, e.g. after the shared password changes. */
export async function revokePortalSessions(portalId: string) {
  await db.delete(sessions).where(and(eq(sessions.kind, "portal"), eq(sessions.portalId, portalId)));
}
