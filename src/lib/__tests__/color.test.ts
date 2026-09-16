import { describe, expect, it } from "vitest";
import { colorValues, contrastRatio, hexToRgb, normalizeHex, readableTextColor, rgbToCmyk } from "../color";

describe("normalizeHex", () => {
  it("expands shorthand and uppercases", () => {
    expect(normalizeHex("#abc")).toBe("#AABBCC");
    expect(normalizeHex(" 0f3d3e ")).toBe("#0F3D3E");
  });

  it("rejects anything that isn't a hex color", () => {
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex("red")).toBeNull();
  });
});

describe("colorValues", () => {
  it("converts hex to rgb, hsl and cmyk", () => {
    expect(colorValues("#FF0000")).toEqual({
      hex: "#FF0000",
      rgb: "rgb(255, 0, 0)",
      hsl: "hsl(0, 100%, 50%)",
      cmyk: "0, 100, 100, 0",
    });
  });

  it("prefers a designer-supplied CMYK value", () => {
    expect(colorValues("#0F3D3E", "90, 45, 55, 60").cmyk).toBe("90, 45, 55, 60");
  });

  it("handles pure black without dividing by zero", () => {
    expect(rgbToCmyk(hexToRgb("#000"))).toEqual({ c: 0, m: 0, y: 0, k: 100 });
  });
});

describe("contrast", () => {
  it("measures black on white as 21:1", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21);
  });

  it("picks the more readable text color", () => {
    expect(readableTextColor("#0F3D3E")).toBe("#FFFFFF");
    expect(readableTextColor("#F4EFE6")).toBe("#000000");
  });
});
