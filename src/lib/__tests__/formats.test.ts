import { describe, expect, it } from "vitest";
import { exportOptionsFor, fileUrl, mimeForUpload, uploadHeaderMatches } from "../formats";

const keys = (mime: string, name: string) => exportOptionsFor(mime, name).map((o) => o.key);

describe("exportOptionsFor", () => {
  it("offers vector and raster renditions for SVGs", () => {
    expect(keys("image/svg+xml", "logo.svg")).toEqual(["original", "png-1x", "png-2x", "png-4x", "jpg-2x", "webp-2x"]);
  });

  it("skips converting a raster image to its own format", () => {
    expect(keys("image/png", "banner.png")).toEqual(["original", "jpg", "webp"]);
    expect(keys("image/jpeg", "photo.JPEG")).toEqual(["original", "png", "webp"]);
  });

  it("only offers the original for non-image files", () => {
    expect(keys("application/pdf", "guidelines.pdf")).toEqual(["original"]);
  });
});

describe("mimeForUpload", () => {
  it("allows known types case-insensitively and rejects others", () => {
    expect(mimeForUpload("Brand-Bold.WOFF2")).toBe("font/woff2");
    expect(mimeForUpload("installer.exe")).toBeNull();
    expect(mimeForUpload("no-extension")).toBeNull();
  });
});

describe("fileUrl", () => {
  it("builds download links", () => {
    expect(fileUrl("abc", { variant: "png-2x", download: true })).toBe("/api/files/abc?v=png-2x&download=1");
    expect(fileUrl("abc", { variant: "original" })).toBe("/api/files/abc");
  });
});

describe("upload headers", () => {
  it("rejects renamed HTML and accepts supported document/font signatures", () => {
    const html = Buffer.from("<html><script>alert(1)</script></html>");
    for (const ext of ["pdf", "zip", "woff", "woff2", "ttf", "otf", "mp4", "png", "jpg", "gif", "webp", "ai", "eps"]) {
      expect(uploadHeaderMatches(`file.${ext}`, html)).toBe(false);
    }
    expect(uploadHeaderMatches("kit.zip", new Uint8Array([80, 75, 3, 4]))).toBe(true);
    expect(uploadHeaderMatches("guide.pdf", Buffer.from("%PDF-1.7"))).toBe(true);
    expect(uploadHeaderMatches("font.woff2", Buffer.from("wOF2"))).toBe(true);
    expect(uploadHeaderMatches("video.mp4", Buffer.from("0000ftypisom"))).toBe(true);
  });
});
