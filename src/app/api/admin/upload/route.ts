import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { findOwnedPortal, getCurrentAdmin } from "@/lib/auth/admin";
import { BLOCK_META } from "@/lib/blocks";
import { nextPosition, touchPortal } from "@/lib/data/portals";
import { db } from "@/lib/db";
import { assets, blocks, fonts, pages, portals, type BlockType } from "@/lib/db/schema";
import { deleteFile, deleteFileById, storeFile, UploadError } from "@/lib/files";
import { extensionOf, FONT_EXTENSIONS, IMAGE_EXTENSIONS, UPLOAD_TYPES } from "@/lib/formats";
import { guessFontDetails, guessPlatform, humanizeFilename } from "@/lib/naming";
import { newId } from "@/lib/utils";

const json = (body: object, status = 200) => Response.json(body, { status });

/** Which uploads each block type takes. Blocks not listed are edited without uploads. */
const ALLOWED_EXTENSIONS: Partial<Record<BlockType, string[]>> = {
  media: [...IMAGE_EXTENSIONS, "mp4"],
  icons: ["svg", "png"],
  banners: [...IMAGE_EXTENSIONS, "mp4"],
  typeface: FONT_EXTENSIONS,
  files: Object.keys(UPLOAD_TYPES),
};

const PORTAL_IMAGES = { logo: "logoFileId", cover: "coverFileId", wordmark: "wordmarkFileId" } as const;

/**
 * Admin uploads, one file per request:
 * - `asset`: into a block (images, icons, banners, downloads, or font files for a typeface block)
 * - `pageButton`: the file behind a page's download button
 * - `logo`, `cover`, `wordmark`: portal branding
 */
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return json({ error: "Your session has ended. Sign in again." }, 401);

  // Same-origin check: cookies are SameSite=Lax, but be explicit for a state-changing endpoint.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || new URL(origin).host !== host) return json({ error: "Invalid request origin." }, 403);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "The upload couldn't be read." }, 400);
  }
  const purpose = form.get("purpose");
  const portalId = form.get("portalId");
  const upload = form.get("file");
  if (typeof portalId !== "string" || !(upload instanceof File)) return json({ error: "Missing file." }, 400);

  const portal = await findOwnedPortal(admin, portalId);
  if (!portal) return json({ error: "Portal not found." }, 404);

  const ext = extensionOf(upload.name);
  const store = async () =>
    storeFile({
      agencyId: admin.agencyId,
      portalId: portal.id,
      name: upload.name,
      data: new Uint8Array(await upload.arrayBuffer()),
    });

  try {
    if (purpose === "logo" || purpose === "cover" || purpose === "wordmark") {
      if (!["svg", "png", "jpg", "webp"].includes(ext)) {
        return json({ error: "Upload an SVG, PNG, JPG or WEBP image." }, 400);
      }
      const column = PORTAL_IMAGES[purpose];
      const file = await store();
      await db
        .update(portals)
        .set({ [column]: file.id, updatedAt: new Date() })
        .where(eq(portals.id, portal.id));
      await deleteFileById(portal[column]);
      return json({ ok: true, fileId: file.id });
    }

    if (purpose === "pageButton") {
      const pageId = form.get("pageId");
      const page =
        typeof pageId === "string"
          ? await db.query.pages.findFirst({ where: and(eq(pages.id, pageId), eq(pages.portalId, portal.id)) })
          : undefined;
      if (!page) return json({ error: "Page not found." }, 404);
      const file = await store();
      await db.update(pages).set({ buttonFileId: file.id }).where(eq(pages.id, page.id));
      await deleteFileById(page.buttonFileId);
      await touchPortal(portal.id);
      return json({ ok: true, fileId: file.id });
    }

    if (purpose !== "asset") return json({ error: "Unknown upload type." }, 400);

    const blockId = form.get("blockId");
    const block =
      typeof blockId === "string"
        ? await db.query.blocks.findFirst({ where: and(eq(blocks.id, blockId), eq(blocks.portalId, portal.id)) })
        : undefined;
    if (!block) return json({ error: "Block not found." }, 404);

    const allowed = ALLOWED_EXTENSIONS[block.type];
    if (!allowed) return json({ error: `${BLOCK_META[block.type].label} blocks don't take uploads.` }, 400);
    if (!allowed.includes(ext)) {
      return json(
        { error: `${upload.name}: ${BLOCK_META[block.type].label} accepts ${allowed.map((e) => e.toUpperCase()).join(", ")} files.` },
        400,
      );
    }

    const file = await store();
    try {
      if (block.type === "typeface") {
        const guess = guessFontDetails(upload.name);
        await db.insert(fonts).values({
          id: newId(),
          portalId: portal.id,
          blockId: block.id,
          family: guess.family.replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim() || "Custom font",
          source: "upload",
          weights: String(guess.weight),
          style: guess.style,
          fileId: file.id,
          position: await nextPosition(fonts, block.id),
        });
      } else {
        await db.insert(assets).values({
          id: newId(),
          portalId: portal.id,
          blockId: block.id,
          fileId: file.id,
          name: humanizeFilename(upload.name),
          groupLabel: block.type === "banners" && file.width && file.height ? guessPlatform(file.width, file.height) : "",
          position: await nextPosition(assets, block.id),
        });
      }
    } catch (error) {
      await deleteFile(file);
      throw error;
    }

    await touchPortal(portal.id);
    return json({ ok: true, fileId: file.id });
  } catch (error) {
    if (error instanceof UploadError) return json({ error: error.message }, 400);
    console.error("Upload failed", error);
    return json({ error: "Something went wrong saving that file." }, 500);
  }
}
