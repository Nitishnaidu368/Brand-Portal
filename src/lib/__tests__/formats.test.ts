import { describe, expect, it } from "vitest";
import { exportOptionsFor, fileUrl, mimeForUpload } from "../formats";

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
