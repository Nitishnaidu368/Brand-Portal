import sharp from "sharp";
import { isSvgMime } from "./formats";

const MAX_EDGE = 8000;

export async function probeDimensions(data: Uint8Array) {
  try {
    const meta = await sharp(data).metadata();
    if (meta.width && meta.height) return { width: meta.width, height: meta.height };
  } catch {
    // not an image sharp understands
  }
  return null;
}

/**
 * Render an image to png/jpg/webp. SVGs are rasterised at `scale` × their intrinsic size;
 * raster images are resized by `scale`. `maxWidth` caps the output for previews.
 */
export async function renderImage(
  data: Uint8Array,
  mime: string,
  format: "png" | "jpg" | "webp",
  scale: number,
  maxWidth?: number,
) {
  const svg = isSvgMime(mime);
  const meta = await sharp(data).metadata();
  const baseWidth = meta.width ?? 512;
  const baseHeight = meta.height ?? 512;

  let factor = scale;
  const longest = Math.max(baseWidth, baseHeight) * factor;
  if (longest > MAX_EDGE) factor *= MAX_EDGE / longest;
  if (maxWidth && baseWidth * factor > maxWidth) factor = maxWidth / baseWidth;

  const width = Math.max(1, Math.round(baseWidth * factor));
  let image = svg
    ? sharp(data, { density: Math.min(100000, Math.max(1, 72 * factor)) })
    : sharp(data, { animated: false });
  if (factor !== 1 || svg) image = image.resize({ width });

  switch (format) {
    case "png":
      return image.png({ compressionLevel: 9 }).toBuffer();
    case "jpg":
      return image.flatten({ background: "#ffffff" }).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    case "webp":
      return image.webp({ quality: 88 }).toBuffer();
  }
}
