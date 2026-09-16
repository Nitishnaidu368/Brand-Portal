export const UPLOAD_TYPES: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  eps: "application/postscript",
  ai: "application/postscript",
  zip: "application/zip",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  mp4: "video/mp4",
};

export const FONT_EXTENSIONS = ["woff2", "woff", "ttf", "otf"];
export const IMAGE_EXTENSIONS = ["svg", "png", "jpg", "jpeg", "webp", "gif"];

const RASTER_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export function extensionOf(name: string) {
  const match = /\.([a-z0-9]+)$/i.exec(name);
  const ext = match ? match[1].toLowerCase() : "";
  return ext === "jpeg" ? "jpg" : ext;
}

export function mimeForUpload(name: string) {
  return UPLOAD_TYPES[extensionOf(name)] ?? null;
}

export const isSvgMime = (mime: string) => mime === "image/svg+xml";
export const isRasterMime = (mime: string) => RASTER_MIME.has(mime);
export const isImageMime = (mime: string) => isSvgMime(mime) || isRasterMime(mime);
export const isFontMime = (mime: string) => mime.startsWith("font/");

export type VariantFormat = "original" | "png" | "jpg" | "webp";

export type ExportOption = {
  key: string;
  label: string;
  format: VariantFormat;
  scale: number;
  ext: string;
};

/** Download formats offered for a stored file. Conversions are rendered on demand and cached. */
export function exportOptionsFor(mime: string, originalName: string): ExportOption[] {
  const originalExt = extensionOf(originalName) || "bin";
  if (isSvgMime(mime)) {
    return [
      { key: "original", label: "SVG", format: "original", scale: 1, ext: "svg" },
      { key: "png-1x", label: "PNG · 1x", format: "png", scale: 1, ext: "png" },
      { key: "png-2x", label: "PNG · 2x", format: "png", scale: 2, ext: "png" },
      { key: "png-4x", label: "PNG · 4x", format: "png", scale: 4, ext: "png" },
      { key: "jpg-2x", label: "JPG · 2x", format: "jpg", scale: 2, ext: "jpg" },
      { key: "webp-2x", label: "WEBP · 2x", format: "webp", scale: 2, ext: "webp" },
    ];
  }
  const options: ExportOption[] = [
    {
      key: "original",
      label: `${originalExt.toUpperCase()} · original`,
      format: "original",
      scale: 1,
      ext: originalExt,
    },
  ];
  if (isRasterMime(mime)) {
    for (const format of ["png", "jpg", "webp"] as const) {
      if (format !== originalExt) {
        options.push({ key: format, label: format.toUpperCase(), format, scale: 1, ext: format });
      }
    }
  }
  return options;
}

export function fileUrl(fileId: string, opts: { variant?: string; download?: boolean; preview?: boolean } = {}) {
  const params = new URLSearchParams();
  if (opts.variant && opts.variant !== "original") params.set("v", opts.variant);
  if (opts.download) params.set("download", "1");
  if (opts.preview) params.set("preview", "1");
  const query = params.toString();
  return `/api/files/${fileId}${query ? `?${query}` : ""}`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Header checks reject mislabeled documents; image decoding and SVG sanitizing happen server-side. */
export function uploadHeaderMatches(name: string, data: Uint8Array) {
  const ext = extensionOf(name);
  const header = new TextDecoder("latin1").decode(data.subarray(0, 32));
  const starts = (...bytes: number[]) => bytes.every((byte, index) => data[index] === byte);
  switch (ext) {
    case "svg": return true; // The SVG sanitizer/parser validates the whole document.
    case "png": return starts(137, 80, 78, 71, 13, 10, 26, 10);
    case "jpg": return starts(255, 216, 255);
    case "gif": return header.startsWith("GIF87a") || header.startsWith("GIF89a");
    case "webp": return header.startsWith("RIFF") && header.slice(8, 12) === "WEBP";
    case "pdf": return header.startsWith("%PDF-");
    case "zip": return starts(80, 75, 3, 4) || starts(80, 75, 5, 6) || starts(80, 75, 7, 8);
    case "ai": return header.startsWith("%PDF-") || header.startsWith("%!PS");
    case "eps": return header.startsWith("%!PS") || starts(197, 208, 211, 198);
    case "woff": return header.startsWith("wOFF");
    case "woff2": return header.startsWith("wOF2");
    case "ttf": return starts(0, 1, 0, 0) || header.startsWith("true") || header.startsWith("ttcf");
    case "otf": return header.startsWith("OTTO") || header.startsWith("ttcf");
    case "mp4": return header.slice(4, 8) === "ftyp";
    default: return false;
  }
}
