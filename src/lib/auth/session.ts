import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { randomToken, sha256 } from "./password";

type NewSession =
  | { kind: "admin"; adminId: string }
  | { kind: "portal"; portalId: string; portalUserId: string | null };

export async function createSession(input: NewSession, days: number) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  await db.insert(sessions).values({
    id: sha256(token),
    kind: input.kind,
    adminId: input.kind === "admin" ? input.adminId : null,
    portalId: input.kind === "portal" ? input.portalId : null,
    portalUserId: input.kind === "portal" ? input.portalUserId : null,
    expiresAt,
  });
  return { token, expiresAt };
}

export async function findSession(token: string | undefined) {
  if (!token) return null;
  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())),
  });
  return session ?? null;
}

export async function deleteSession(token: string | undefined) {
  if (token) await db.delete(sessions).where(eq(sessions.id, sha256(token)));
}
