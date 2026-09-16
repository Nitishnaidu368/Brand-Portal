import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { renderImage } from "../images";
import { sanitizeSvg } from "../svg";

const hostile = `<?xml version="1.0"?>
<!DOCTYPE svg [<!ENTITY boom "boom">]>
<svg viewBox="0 0 24 24" width="24" height="24" onload="alert(1)">
  <script>alert(1)</script>
  <foreignObject><div>hi</div></foreignObject>
  <a href="javascript:alert(1)"><circle cx="12" cy="12" r="10" fill="#0F3D3E"/></a>
  <text x="2" y="20">a&#160;b</text>
</svg>`;

describe("sanitizeSvg", () => {
  it("removes scripts, handlers and foreign content", () => {
    const clean = sanitizeSvg(hostile)!;
    expect(clean).not.toMatch(/script|onload|foreignObject|javascript:|ENTITY/i);
    expect(clean).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(clean).toContain('viewBox="0 0 24 24"');
    expect(clean).toContain("<circle");
    expect(clean).not.toContain("&nbsp;");
  });

  it("keeps the SVG renderable", async () => {
    const meta = await sharp(Buffer.from(sanitizeSvg(hostile)!)).metadata();
    expect([meta.width, meta.height]).toEqual([24, 24]);
  });

  it("rejects input with no SVG in it", () => {
    expect(sanitizeSvg("<div>not an svg</div>")).toBeNull();
  });
});

describe("renderImage", () => {
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100" height="50" fill="red"/></svg>',
  );

  it("rasterises an SVG at 2x", async () => {
    const meta = await sharp(await renderImage(svg, "image/svg+xml", "png", 2)).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["png", 200, 100]);
  });

  it("caps preview width", async () => {
    const meta = await sharp(await renderImage(svg, "image/svg+xml", "webp", 4, 150)).metadata();
    expect([meta.format, meta.width]).toEqual(["webp", 150]);
  });

  it("flattens transparency onto white for JPG", async () => {
    const transparent = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>');
    const { data } = await sharp(await renderImage(transparent, "image/svg+xml", "jpg", 1))
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect([data[0], data[1], data[2]]).toEqual([255, 255, 255]);
  });
});
