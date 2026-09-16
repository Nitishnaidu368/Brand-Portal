import { describe, expect, it } from "vitest";
import { parseWeights } from "../fonts";
import { guessFontDetails, guessPlatform, humanizeFilename } from "../naming";

describe("humanizeFilename", () => {
  it("turns filenames into readable names", () => {
    expect(humanizeFilename("primary_logo-dark.svg")).toBe("Primary Logo Dark");
    expect(humanizeFilename(".svg")).toBe("Untitled");
  });
});

describe("guessFontDetails", () => {
  it.each([
    ["Inter-Regular.woff2", "Inter", 400, "normal"],
    ["PlayfairDisplay-SemiBoldItalic.ttf", "Playfair Display", 600, "italic"],
    ["Fraunces_ExtraLight.otf", "Fraunces", 200, "normal"],
    ["Brand-ExtraBold.woff", "Brand", 800, "normal"],
    ["Mono-Light.woff2", "Mono", 300, "normal"],
  ])("%s", (file, family, weight, style) => {
    expect(guessFontDetails(file)).toEqual({ family, weight, style });
  });
});

describe("guessPlatform", () => {
  it("recognises common sizes at 1x and 2x", () => {
    expect(guessPlatform(1584, 396)).toBe("LinkedIn");
    expect(guessPlatform(2160, 2160)).toBe("Instagram");
    expect(guessPlatform(999, 333)).toBe("");
  });
});

describe("parseWeights", () => {
  it("parses, dedupes and sorts", () => {
    expect(parseWeights("700, 400 400,bold, 1200")).toEqual([400, 700]);
  });
});
