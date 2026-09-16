import type { NextRequest } from "next/server";
import { getPortalById, getPortalViewer } from "@/lib/auth/portal";
import { getGuide, logDownload } from "@/lib/data/portals";
import { COLOR_EXPORT_FORMATS, colorExportFilename, isColorExportFormat, renderColorExport } from "@/lib/exports";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/portals/[portalId]/colors">) {
  const { portalId } = await ctx.params;
  const portal = await getPortalById(portalId);
  const viewer = portal ? await getPortalViewer(portal) : null;
  if (!portal || !viewer) return new Response("Not found", { status: 404 });

  const format = request.nextUrl.searchParams.get("format") ?? "css";
  if (!isColorExportFormat(format)) return new Response("Unknown format", { status: 400 });

  const blockId = request.nextUrl.searchParams.get("block");
  const palette = (await getGuide(portal.id))
    .filter((page) => viewer.kind === "admin" || !page.isHidden)
    .flatMap((page) => page.blocks)
    .filter((block) => !blockId || block.id === blockId)
    .flatMap((block) => block.colors);
  if (palette.length === 0) return new Response("No colors", { status: 404 });

  const output = renderColorExport(format, palette, portal.clientName);
  if (viewer.kind === "client") {
    await logDownload({
      portalId: portal.id,
      kind: "colors",
      label: "Color palette",
      format: COLOR_EXPORT_FORMATS[format].label,
      actor: viewer.label,
    });
  }

  return new Response(output, {
    headers: {
      "Content-Type": COLOR_EXPORT_FORMATS[format].mime,
      "Content-Disposition": `attachment; filename="${colorExportFilename(format, portal.slug)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
