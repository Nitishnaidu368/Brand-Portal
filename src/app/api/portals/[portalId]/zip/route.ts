import { ZipArchive } from "archiver";
import { eq } from "drizzle-orm";
import { Readable } from "node:stream";
import type { NextRequest } from "next/server";
import { getPortalById, getPortalViewer } from "@/lib/auth/portal";
import { getGuide, logDownload } from "@/lib/data/portals";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { COLOR_EXPORT_FORMATS, colorExportFilename, renderColorExport, type ColorExportFormat } from "@/lib/exports";
import { readFileVariant } from "@/lib/files";
import { exportOptionsFor, extensionOf, isSvgMime } from "@/lib/formats";
import { blockHasContent, clientPages, pageNumber, type GuidePage } from "@/lib/guide";
import { getObject } from "@/lib/storage";
import { slugify } from "@/lib/utils";

/** Plain-text version of a page's written guidance. */
function pageMarkdown(page: GuidePage) {
  const parts = [`# ${page.title}`];
  if (page.intro.trim()) parts.push(page.intro.trim());
  for (const block of page.blocks) {
    const heading = [block.data.label, block.data.sublabel].filter((s) => s.trim()).join(" · ");
    const lines: string[] = [];
    if (block.data.body.trim()) lines.push(block.data.body.trim());
    if (block.type === "cards") {
      for (const item of block.data.items) {
        if (item.title.trim() || item.body.trim()) lines.push(`**${item.title.trim()}**\n${item.body.trim()}`);
      }
    }
    if (lines.length > 0) parts.push(`${heading ? `## ${heading}\n\n` : ""}${lines.join("\n\n")}`);
  }
  return parts.length > 1 ? `${parts.join("\n\n")}\n` : null;
}

/**
 * Streams brand files as a ZIP: the whole kit with one numbered folder per page, or a single page
 * with ?page=<id> (used by a page's download button).
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/portals/[portalId]/zip">) {
  const { portalId } = await ctx.params;
  const portal = await getPortalById(portalId);
  const viewer = portal ? await getPortalViewer(portal) : null;
  if (!portal || !viewer) return new Response("Not found", { status: 404 });
  if (!portal.allowZip && viewer.kind !== "admin") {
    return new Response("Bulk downloads are turned off for this portal.", { status: 403 });
  }

  const [guide, fileRows] = await Promise.all([getGuide(portal.id), db.select().from(files).where(eq(files.portalId, portal.id))]);
  const pages = clientPages(guide);
  const pageId = request.nextUrl.searchParams.get("page");
  const selected = pageId ? pages.filter((page) => page.id === pageId) : pages;
  if (pageId && selected.length === 0) return new Response("Not found", { status: 404 });

  const fileById = new Map(fileRows.map((f) => [f.id, f]));
  const root = pageId ? `${portal.slug}-${selected[0].slug}` : `${portal.slug}-brand-kit`;

  const used = new Set<string>();
  const uniqueName = (name: string) => {
    let candidate = name;
    for (let n = 2; used.has(candidate); n++) candidate = name.replace(/(\.[^./]+)?$/, `-${n}$1`);
    used.add(candidate);
    return candidate;
  };

  const archive = new ZipArchive({ zlib: { level: 6 } });

  async function fill() {
    for (const page of selected) {
      const folder = pageId ? root : `${root}/${pageNumber(pages.indexOf(page))}-${page.slug}`;
      const content = page.blocks.filter(blockHasContent);

      const palette = content.flatMap((block) => block.colors);
      if (palette.length > 0) {
        for (const format of Object.keys(COLOR_EXPORT_FORMATS) as ColorExportFormat[]) {
          const output = renderColorExport(format, palette, portal!.clientName);
          archive.append(typeof output === "string" ? output : Buffer.from(output), {
            name: uniqueName(`${folder}/colors/${colorExportFilename(format, portal!.slug)}`),
          });
        }
      }

      const markdown = pageMarkdown({ ...page, blocks: content });
      if (markdown) archive.append(markdown, { name: uniqueName(`${folder}/${page.slug}.md`) });

      const assetBlocks = content.filter((block) => block.assets.length > 0);
      for (const block of assetBlocks) {
        const label = slugify(block.data.label || block.data.sublabel);
        const blockFolder = assetBlocks.length > 1 && label ? `${folder}/${label}` : folder;
        for (const asset of block.assets) {
          const file = fileById.get(asset.fileId);
          if (!file) continue;
          const base = slugify(asset.name) || "asset";
          const group = asset.groupLabel ? `${slugify(asset.groupLabel)}/` : "";
          archive.append(await getObject(file.storageKey), {
            name: uniqueName(`${blockFolder}/${group}${base}.${extensionOf(file.originalName)}`),
          });
          if (block.type === "media" && block.data.downloadable && isSvgMime(file.mimeType)) {
            const option = exportOptionsFor(file.mimeType, file.originalName).find((o) => o.key === "png-2x")!;
            const png = await readFileVariant(file, option);
            archive.append(png.data, { name: uniqueName(`${blockFolder}/png/${base}@2x.png`) });
          }
        }
      }

      const typefaces = content.flatMap((block) => block.fonts);
      const googleFonts = typefaces.filter((f) => f.source === "google");
      if (googleFonts.length > 0) {
        const lines = googleFonts.map(
          (f) => `${f.family} (${f.weights}): https://fonts.google.com/specimen/${f.family.replace(/ /g, "+")}`,
        );
        archive.append(`${lines.join("\n")}\n`, { name: uniqueName(`${folder}/fonts/google-fonts.txt`) });
      }
      for (const font of typefaces) {
        const file = font.fileId ? fileById.get(font.fileId) : undefined;
        if (!file) continue;
        const style = font.style === "italic" ? "-italic" : "";
        archive.append(await getObject(file.storageKey), {
          name: uniqueName(
            `${folder}/fonts/${slugify(font.family)}-${font.weights.replace(/\D+/g, "-")}${style}.${extensionOf(file.originalName)}`,
          ),
        });
      }
    }
    await archive.finalize();
  }

  fill().catch((error) => {
    console.error("ZIP export failed", error);
    archive.destroy(error as Error);
  });

  if (viewer.kind === "client") {
    await logDownload({
      portalId: portal.id,
      kind: "zip",
      label: pageId ? `${selected[0].title} files` : "Full brand kit",
      format: "ZIP",
      actor: viewer.label,
    });
  }

  return new Response(Readable.toWeb(archive) as ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${root}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
