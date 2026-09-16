import { and, eq, gt } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { findOwnedPortal, getCurrentAdmin } from "@/lib/auth/admin";
import { BLOCK_META } from "@/lib/blocks";
import { MAX_UPLOAD_BYTES } from "@/lib/config";
import { nextPosition } from "@/lib/data/portals";
import { db } from "@/lib/db";
import { assets, blocks, fonts, pages, pendingUploads, portals, type BlockType } from "@/lib/db/schema";
import { deleteFile, deleteFileById, storeFile, UploadError } from "@/lib/files";
import { extensionOf, FONT_EXTENSIONS, IMAGE_EXTENSIONS, UPLOAD_TYPES } from "@/lib/formats";
import { guessFontDetails, guessPlatform, humanizeFilename } from "@/lib/naming";
import { getObject, storageBucket } from "@/lib/storage";
import { cleanupExpiredUploads } from "@/lib/uploads";
import { newId } from "@/lib/utils";

const json = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("init"),
    portalId: z.uuid(),
    purpose: z.enum(["asset", "pageButton", "logo", "cover", "wordmark"]),
    blockId: z.uuid().optional(),
    pageId: z.uuid().optional(),
    name: z.string().trim().min(1).max(200),
    size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  }),
  z.object({ action: z.literal("complete"), uploadId: z.uuid() }),
]);

const ALLOWED_EXTENSIONS: Partial<Record<BlockType, string[]>> = {
  media: [...IMAGE_EXTENSIONS, "mp4"],
  icons: ["svg", "png"],
  banners: [...IMAGE_EXTENSIONS, "mp4"],
  typeface: FONT_EXTENSIONS,
  files: Object.keys(UPLOAD_TYPES),
};
const PORTAL_IMAGES = { logo: "logoFileId", cover: "coverFileId", wordmark: "wordmarkFileId" } as const;

/** Only metadata crosses this endpoint. Bytes go directly to a private staging object. */
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return json({ error: "Your session has ended. Sign in again." }, 401);
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    if (!origin || new URL(origin).host !== host) return json({ error: "Invalid request origin." }, 403);
  } catch {
    return json({ error: "Invalid request origin." }, 403);
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: `Invalid upload. Use a supported file up to ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` }, 400);
  const input = parsed.data;

  try {
    const pending = input.action === "complete"
      ? await db.query.pendingUploads.findFirst({ where: and(
          eq(pendingUploads.id, input.uploadId), eq(pendingUploads.adminId, admin.id),
          eq(pendingUploads.claimed, false), gt(pendingUploads.expiresAt, new Date()),
        ) })
      : null;
    if (input.action === "complete" && !pending) return json({ error: "Upload expired or already processed. Upload the file again." }, 409);
    const upload = input.action === "init" ? input : pending!;
    const portal = await findOwnedPortal(admin, upload.portalId);
    if (!portal) return json({ error: "Portal not found." }, 404);
    const { purpose } = upload;
    const page = purpose === "pageButton" && upload.pageId
      ? await db.query.pages.findFirst({ where: and(eq(pages.id, upload.pageId), eq(pages.portalId, portal.id)) }) : null;
    const block = purpose === "asset" && upload.blockId
      ? await db.query.blocks.findFirst({ where: and(eq(blocks.id, upload.blockId), eq(blocks.portalId, portal.id)) }) : null;
    if (purpose === "pageButton" && !page) return json({ error: "Page not found." }, 404);
    if (purpose === "asset" && !block) return json({ error: "Block not found." }, 404);
    const allowed = block ? ALLOWED_EXTENSIONS[block.type]
      : purpose === "pageButton" ? Object.keys(UPLOAD_TYPES) : ["svg", "png", "jpg", "webp"];
    if (!allowed?.includes(extensionOf(upload.name))) {
      return json({ error: `${block ? BLOCK_META[block.type].label : "This upload"} does not accept that file type.` }, 400);
    }

    if (input.action === "init") {
      await cleanupExpiredUploads(10);
      const id = newId();
      const storageKey = `pending/${portal.id}/${id}`;
      await db.insert(pendingUploads).values({
        id, adminId: admin.id, portalId: portal.id, purpose,
        blockId: block?.id, pageId: page?.id, name: input.name, sizeBytes: input.size, storageKey,
        // Supabase upload tokens last two hours; keep staging objects until the token has expired.
        expiresAt: new Date(Date.now() + 130 * 60 * 1000),
      });
      const { data, error } = await storageBucket().createSignedUploadUrl(storageKey, { upsert: false });
      if (error) {
        await db.delete(pendingUploads).where(eq(pendingUploads.id, id));
        throw error;
      }
      return json({ uploadId: id, uploadUrl: data.signedUrl });
    }

    const [claimed] = await db.update(pendingUploads).set({ claimed: true }).where(and(
      eq(pendingUploads.id, pending!.id), eq(pendingUploads.claimed, false),
      gt(pendingUploads.expiresAt, new Date()),
    )).returning();
    if (!claimed) return json({ error: "Upload already processed. Refresh the page." }, 409);
    const { data: info, error } = await storageBucket().info(claimed.storageKey);
    if (error) throw error;
    if (info.size !== claimed.sizeBytes || info.size > MAX_UPLOAD_BYTES) throw new UploadError("The uploaded file size does not match. Upload the file again.");
    const data = await getObject(claimed.storageKey);
    if (data.byteLength !== claimed.sizeBytes) throw new UploadError("The uploaded file is incomplete. Upload it again.");
    const file = await storeFile({ agencyId: admin.agencyId, portalId: portal.id, name: claimed.name, data });
    const oldFileId = page?.buttonFileId ?? (purpose in PORTAL_IMAGES ? portal[PORTAL_IMAGES[purpose as keyof typeof PORTAL_IMAGES]] : null);
    try {
      await db.transaction(async (tx) => {
        if (purpose in PORTAL_IMAGES) {
          const rows = await tx.update(portals).set({ [PORTAL_IMAGES[purpose as keyof typeof PORTAL_IMAGES]]: file.id }).where(eq(portals.id, portal.id)).returning({ id: portals.id });
          if (!rows.length) throw new UploadError("This portal was deleted while uploading.");
        } else if (page) {
          const rows = await tx.update(pages).set({ buttonFileId: file.id }).where(eq(pages.id, page.id)).returning({ id: pages.id });
          if (!rows.length) throw new UploadError("This page was deleted while uploading.");
        } else if (block?.type === "typeface") {
          const guess = guessFontDetails(claimed.name);
          await tx.insert(fonts).values({
            id: newId(), portalId: portal.id, blockId: block.id, fileId: file.id,
            family: guess.family.replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim() || "Custom font",
            source: "upload", weights: String(guess.weight), style: guess.style,
            position: await nextPosition(fonts, block.id),
          });
        } else if (block) {
          await tx.insert(assets).values({
            id: newId(), portalId: portal.id, blockId: block.id, fileId: file.id,
            name: humanizeFilename(claimed.name),
            groupLabel: block.type === "banners" && file.width && file.height ? guessPlatform(file.width, file.height) : "",
            position: await nextPosition(assets, block.id),
          });
        }
        await tx.update(portals).set({ updatedAt: new Date() }).where(eq(portals.id, portal.id));
      });
    } catch (error) {
      await deleteFile(file);
      throw error;
    }
    // A cleanup failure must not report a successfully attached replacement as a failed upload.
    await deleteFileById(oldFileId).catch((error) => console.error("Old upload cleanup failed", error));
    return json({ ok: true, fileId: file.id });
  } catch (error) {
    if (error instanceof UploadError) return json({ error: error.message }, 400);
    console.error("Upload failed", error);
    return json({ error: "Could not finish this upload. Please upload the file again." }, 500);
  }
}
