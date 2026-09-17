import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { getPortalById, getPortalViewer } from "@/lib/auth/portal";
import { getGuide, logDownload } from "@/lib/data/portals";
import { db } from "@/lib/db";
import { assets, files, fonts } from "@/lib/db/schema";
import { downloadFilename, fileVariantKey, previewKey } from "@/lib/files";
import { exportOptionsFor } from "@/lib/formats";
import { clientCanReadFile } from "@/lib/guide";
import { signedObjectUrl } from "@/lib/storage";

const notFound = () => new Response("Not found", { status: 404 });

/**
 * Serves stored files to people allowed to see them: agency admins, and clients signed in to the
 * owning portal. Supports on-the-fly format conversion (?v=png-2x), thumbnails (?preview=1) and
 * attachment downloads (?download=1), which are logged for client viewers.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/files/[fileId]">) {
  const { fileId } = await ctx.params;
  const file = await db.query.files.findFirst({ where: eq(files.id, fileId) });
  if (!file) return notFound();

  let viewer: { kind: "admin" | "client" | "public"; label: string } | null = null;
  if (file.portalId) {
    const portal = await getPortalById(file.portalId);
    if (!portal) return notFound();
    viewer = await getPortalViewer(portal);
    if (viewer?.kind === "client" && !clientCanReadFile(portal, await getGuide(portal.id), file.id)) return notFound();
    // The client's logo and cover image also appear on the portal's sign-in screen.
    if (!viewer && portal.isPublished && (file.id === portal.logoFileId || file.id === portal.coverFileId)) {
      viewer = { kind: "public", label: "" };
    }
  } else {
    const admin = await getCurrentAdmin();
    if (admin && admin.agencyId === file.agencyId) viewer = { kind: "admin", label: admin.email };
  }
  if (!viewer) return notFound();

  const params = request.nextUrl.searchParams;
  const download = params.get("download") === "1";
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": "inline",
  });

  let key: string;
  let filename: string | undefined;
  if (params.get("preview") === "1" && !download) {
    try {
      key = await previewKey(file);
    } catch (error) {
      // ponytail: previews are an optimization; serve the original when Sharp or variant storage is unavailable.
      console.error("Preview generation failed; serving original", error);
      key = file.storageKey;
    }
  } else {
    const option = exportOptionsFor(file.mimeType, file.originalName).find((o) => o.key === (params.get("v") ?? "original"));
    if (!option) return new Response("Unsupported format", { status: 400 });
    key = await fileVariantKey(file, option);

    if (download) {
      const [asset, font] = await Promise.all([
        db.query.assets.findFirst({ where: eq(assets.fileId, file.id) }),
        db.query.fonts.findFirst({ where: eq(fonts.fileId, file.id) }),
      ]);
      const label = asset?.name ?? (font ? `${font.family} ${font.weights}` : file.originalName);
      filename = downloadFilename(label, option);
      headers.set("Content-Disposition", `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
      if (viewer.kind === "client" && file.portalId) {
        await logDownload({
          portalId: file.portalId,
          assetId: asset?.id ?? null,
          kind: font ? "font" : "asset",
          label,
          format: option.label,
          actor: viewer.label,
        });
      }
    }
  }

  headers.set("Location", await signedObjectUrl(key, filename));
  return new Response(null, { status: 302, headers });
}
