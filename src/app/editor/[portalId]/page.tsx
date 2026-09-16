import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireOwnedPortal } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";

/** Opens the editor on the portal's first page. */
export default async function EditorHome({ params }: PageProps<"/editor/[portalId]">) {
  const { portalId } = await params;
  const { portal } = await requireOwnedPortal(portalId);
  const first = await db.query.pages.findFirst({
    where: eq(pages.portalId, portal.id),
    orderBy: [asc(pages.position), asc(pages.createdAt)],
  });
  redirect(first ? `/editor/${portal.id}/${first.id}` : `/dashboard/portals/${portal.id}`);
}
