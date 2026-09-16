import { eq } from "drizzle-orm";
import { MAX_UPLOAD_BYTES } from "./config";
import { db } from "./db";
import { files, type FileRecord } from "./db/schema";
import {
  extensionOf,
  isImageMime,
  isRasterMime,
  isSvgMime,
  mimeForUpload,
  uploadHeaderMatches,
  type ExportOption,
} from "./formats";
import { probeDimensions, renderImage } from "./images";
import { deleteObject, deletePrefix, getObject, objectExists, putObject } from "./storage";
import { sanitizeSvg } from "./svg";
import { newId, slugify } from "./utils";

export class UploadError extends Error {}

const FORMAT_MIME = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" } as const;
const PREVIEW_MAX_WIDTH = 1200;

function ownerPrefix(file: Pick<FileRecord, "agencyId" | "portalId">) {
  return file.portalId ? `portals/${file.portalId}` : `agencies/${file.agencyId}`;
}

function variantPrefix(file: FileRecord) {
  return `${ownerPrefix(file)}/variants/${file.id}`;
}

export async function storeFile(input: {
  agencyId: string;
  portalId: string | null;
  name: string;
  data: Uint8Array;
}): Promise<FileRecord> {
  const name = input.name.replace(/[/\\]/g, "_").trim().slice(0, 200) || "file";
  const mime = mimeForUpload(name);
  if (!mime) throw new UploadError(`${name}: this file type isn't supported.`);
  if (input.data.byteLength === 0 || input.data.byteLength > MAX_UPLOAD_BYTES) {
    throw new UploadError(`${name}: files must be under ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`);
  }

  if (!uploadHeaderMatches(name, input.data)) throw new UploadError(`${name}: the contents do not match the file extension.`);

  let data = input.data;
  if (isSvgMime(mime)) {
    const clean = sanitizeSvg(Buffer.from(data).toString("utf8"));
    if (!clean) throw new UploadError(`${name}: this SVG couldn't be read.`);
    data = Buffer.from(clean, "utf8");
  }

  const dimensions = isImageMime(mime) ? await probeDimensions(data) : null;
  if (isImageMime(mime) && !dimensions) throw new UploadError(`${name}: this image couldn't be opened.`);

  const id = newId();
  const storageKey = `${ownerPrefix(input)}/${id}.${extensionOf(name)}`;
  await putObject(storageKey, data, mime);

  try {
    const [record] = await db
      .insert(files)
      .values({
        id,
        agencyId: input.agencyId,
        portalId: input.portalId,
        storageKey,
        originalName: name,
        mimeType: mime,
        sizeBytes: data.byteLength,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
      })
      .returning();
    return record;
  } catch (error) {
    await deleteObject(storageKey).catch((cleanupError) => console.error("Upload cleanup failed", cleanupError));
    throw error;
  }
}

export async function deleteFile(file: FileRecord) {
  await db.delete(files).where(eq(files.id, file.id));
  await deleteObject(file.storageKey);
  await deletePrefix(variantPrefix(file));
}

export async function deleteFileById(fileId: string | null | undefined) {
  if (!fileId) return;
  const file = await db.query.files.findFirst({ where: eq(files.id, fileId) });
  if (file) await deleteFile(file);
}

/** Return an object key; file bytes are delivered by storage rather than the app function. */
export async function fileVariantKey(file: FileRecord, option: ExportOption) {
  if (option.format === "original") {
    return file.storageKey;
  }
  const key = `${variantPrefix(file)}/${option.key}.${option.ext}`;
  const mime = FORMAT_MIME[option.format];
  if (await objectExists(key)) return key;
  const data = await renderImage(await getObject(file.storageKey), file.mimeType, option.format, option.scale);
  await putObject(key, data, mime);
  return key;
}

/** Lightweight rendition for on-screen thumbnails of large raster images. */
export async function previewKey(file: FileRecord) {
  const large = isRasterMime(file.mimeType) && file.mimeType !== "image/gif" && (file.width ?? 0) > PREVIEW_MAX_WIDTH;
  if (!large) return file.storageKey;
  const key = `${variantPrefix(file)}/preview.webp`;
  if (await objectExists(key)) return key;
  const data = await renderImage(await getObject(file.storageKey), file.mimeType, "webp", 1, PREVIEW_MAX_WIDTH);
  await putObject(key, data, "image/webp");
  return key;
}

export function downloadFilename(baseName: string, option: ExportOption) {
  const base = slugify(baseName.replace(/\.[a-z0-9]+$/i, "")) || "asset";
  const suffix = option.scale !== 1 ? `@${option.scale}x` : "";
  return `${base}${suffix}.${option.ext}`;
}

/** The subset of a file record that is safe to send to the browser. */
export function publicFile(file: FileRecord) {
  return {
    id: file.id,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    width: file.width,
    height: file.height,
  };
}

export type PublicFile = ReturnType<typeof publicFile>;
