import { describe, expect, it } from "vitest";
import { toAse, toCss, toJsonTokens, tokenName, toTailwind } from "../exports";

const palette = [
  { name: "Deep Sea", hex: "#0F3D3E" },
  { name: "Foam", hex: "#F4EFE6", pantone: "9224 C" },
  { name: "Foam", hex: "#FFFFFF" },
];

describe("color exports", () => {
  it("writes CSS variables with unique token names", () => {
    const css = toCss(palette, "Tidewater");
    expect(css).toContain("--brand-deep-sea: #0F3D3E;");
    expect(css).toContain("--brand-foam: #F4EFE6;");
    expect(css).toContain("--brand-foam-2: #FFFFFF;");
  });

  it("writes a Tailwind v4 @theme block", () => {
    expect(toTailwind(palette, "Tidewater")).toContain("--color-brand-foam: #F4EFE6;");
  });

  it("writes W3C design tokens", () => {
    const tokens = JSON.parse(toJsonTokens(palette));
    expect(tokens.brand["deep-sea"]).toMatchObject({ $type: "color", $value: "#0F3D3E" });
    expect(tokens.brand.foam.$extensions.pantone).toBe("9224 C");
  });

  it("strips accents from token names", () => {
    expect(tokenName("Café Crème")).toBe("cafe-creme");
    expect(tokenName("Don't stretch")).toBe("dont-stretch");
  });
});

describe("Adobe Swatch Exchange", () => {
  it("encodes the header and an RGB color block", () => {
    const ase = toAse([{ name: "Red", hex: "#FF0000" }]);
    const view = new DataView(ase.buffer);

    expect(String.fromCharCode(...ase.slice(0, 4))).toBe("ASEF");
    expect(view.getUint16(4)).toBe(1); // version 1.0
    expect(view.getUint32(8)).toBe(1); // one block

    expect(view.getUint16(12)).toBe(0x0001); // color entry
    const blockLength = view.getUint32(14);
    expect(ase.byteLength).toBe(12 + 6 + blockLength);
    expect(view.getUint16(18)).toBe(4); // "Red" + null terminator
    expect(String.fromCharCode(view.getUint16(20), view.getUint16(22), view.getUint16(24))).toBe("Red");
    expect(String.fromCharCode(...ase.slice(28, 32))).toBe("RGB ");
    expect(view.getFloat32(32)).toBe(1);
    expect(view.getFloat32(36)).toBe(0);
    expect(view.getFloat32(40)).toBe(0);
    expect(view.getUint16(44)).toBe(2); // normal color
  });
});
