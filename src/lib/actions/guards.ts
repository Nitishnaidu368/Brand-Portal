import "server-only";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail } from "@/lib/action-state";
import { findOwnedPortal, getCurrentAdmin } from "@/lib/auth/admin";
import { normalizeHex } from "@/lib/color";
import { db } from "@/lib/db";
import { blocks, pages, portals } from "@/lib/db/schema";

export const DENIED = fail("You don't have access to that. Try refreshing the page.");

export async function authorizePortal(portalId: unknown) {
  if (typeof portalId !== "string") return null;
  const admin = await getCurrentAdmin();
  if (!admin) return null;
  const portal = await findOwnedPortal(admin, portalId);
  return portal ? { admin, portal } : null;
}

export async function authorizePage(pageId: unknown) {
  if (typeof pageId !== "string") return null;
  const admin = await getCurrentAdmin();
  if (!admin) return null;
  const [row] = await db
    .select({ page: pages, portal: portals })
    .from(pages)
    .innerJoin(portals, eq(pages.portalId, portals.id))
    .where(and(eq(pages.id, pageId), eq(portals.agencyId, admin.agencyId)))
    .limit(1);
  return row ? { admin, ...row } : null;
}

export async function authorizeBlock(blockId: unknown) {
  if (typeof blockId !== "string") return null;
  const admin = await getCurrentAdmin();
  if (!admin) return null;
  const [row] = await db
    .select({ block: blocks, portal: portals })
    .from(blocks)
    .innerJoin(portals, eq(blocks.portalId, portals.id))
    .where(and(eq(blocks.id, blockId), eq(portals.agencyId, admin.agencyId)))
    .limit(1);
  return row ? { admin, ...row } : null;
}

/** Portal pages are all rendered per request, so refreshing the whole tree is cheap. */
export function refreshAll() {
  revalidatePath("/", "layout");
}

export const hexSchema = z.string().transform((value, ctx) => {
  const hex = normalizeHex(value);
  if (!hex) {
    ctx.addIssue({ code: "custom", message: "Enter a hex color like #1A2B3C" });
    return z.NEVER;
  }
  return hex;
});

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Use at least 2 characters")
  .max(48, "Keep it under 48 characters")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single dashes");

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));
