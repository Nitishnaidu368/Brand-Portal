import { describe, expect, it } from "vitest";
import { contrastRating, defaultBlockData, parseBlockData, serializeBlockData, withTextField } from "../blocks";
import { blockHasContent, clientCanReadFile, clientPages, pageNumber, type GuideBlock, type GuidePage } from "../guide";
import { guideTemplate, starterBlockData } from "../templates";
import { BLOCK_TYPES } from "../db/schema";

describe("parseBlockData", () => {
  it("fills in defaults for missing fields", () => {
    const data = parseBlockData("media", "{}");
    expect(data).toMatchObject({ label: "", columns: 2, background: "grey", aspect: "16/9", downloadable: true, divider: true });
  });

  it("falls back per field when stored values are invalid", () => {
    const data = parseBlockData("media", JSON.stringify({ label: "Logo", columns: 99, background: "purple", band: "yes" }));
    expect(data.label).toBe("Logo");
    expect(data.columns).toBe(2);
    expect(data.background).toBe("grey");
    expect(data.band).toBe(false);
  });

  it("keeps a per-row typeface selection while defaulting legacy rows", () => {
    expect(parseBlockData("typescale", JSON.stringify({ items: [{ text: "Display", fontId: "font-1" }] })).items[0].fontId).toBe("font-1");
    expect(parseBlockData("typescale", JSON.stringify({ items: [{ text: "Body" }] })).items[0].fontId).toBe("");
  });

  it("survives corrupt JSON", () => {
    expect(parseBlockData("text", "{not json").body).toBe("");
    expect(parseBlockData("cards", "[1,2]").items).toEqual([]);
  });

  it("normalizes pairing colors", () => {
    const data = parseBlockData("pairings", JSON.stringify({ items: [{ background: "fff", foreground: "nope" }] }));
    expect(data.items[0]).toEqual({ background: "#FFFFFF", foreground: "#FFFFFF" });
  });

  it("accepts every template and starter block", () => {
    for (const page of guideTemplate()) {
      for (const block of page.blocks) expect(() => serializeBlockData(block.type, block.data ?? {})).not.toThrow();
    }
    for (const type of BLOCK_TYPES) expect(() => serializeBlockData(type, starterBlockData(type))).not.toThrow();
  });
});

describe("withTextField", () => {
  const cards = defaultBlockData("cards", { items: [{ title: "Progress", body: "" }] });

  it("edits header fields and list item text", () => {
    expect(withTextField("cards", cards, "label", "Brand Values")?.label).toBe("Brand Values");
    expect(withTextField("cards", cards, "items.0.body", "We move forward.")?.items[0].body).toBe("We move forward.");
  });

  it("rejects settings, unknown fields and missing items", () => {
    expect(withTextField("cards", cards, "columns", "4")).toBeNull();
    expect(withTextField("cards", cards, "items.0.color", "red")).toBeNull();
    expect(withTextField("cards", cards, "items.5.title", "Nope")).toBeNull();
    expect(withTextField("text", defaultBlockData("text"), "items.0.title", "Nope")).toBeNull();
    expect(withTextField("pairings", defaultBlockData("pairings"), "items.0.background", "#000")).toBeNull();
  });

  it("rejects text over the limit", () => {
    expect(withTextField("text", defaultBlockData("text"), "label", "x".repeat(161))).toBeNull();
  });
});

describe("contrastRating", () => {
  it("uses WCAG thresholds for normal text", () => {
    expect(contrastRating(21)).toBe("AAA");
    expect(contrastRating(7)).toBe("AAA");
    expect(contrastRating(4.5)).toBe("AA");
    expect(contrastRating(3.2)).toBe("AA Large");
    expect(contrastRating(1.5)).toBe("Fail");
  });
});

describe("client visibility", () => {
  const block = (overrides: Partial<GuideBlock> & Pick<GuideBlock, "type" | "data">) =>
    ({ id: "b", portalId: "p", pageId: "pg", position: 0, colors: [], assets: [], fonts: [], ...overrides }) as GuideBlock;
  const page = (overrides: Partial<GuidePage>): GuidePage => ({
    id: "pg",
    portalId: "p",
    slug: "logo",
    title: "Logo",
    intro: "",
    buttonLabel: "",
    buttonFileId: null,
    isHidden: false,
    position: 0,
    createdAt: new Date(),
    blocks: [],
    ...overrides,
  });

  it("treats blocks without text or files as empty", () => {
    expect(blockHasContent(block({ type: "text", data: defaultBlockData("text", { sublabel: "Mission" }) }))).toBe(false);
    expect(blockHasContent(block({ type: "text", data: defaultBlockData("text", { label: "Easing" }) }))).toBe(false);
    expect(blockHasContent(block({ type: "text", data: defaultBlockData("text", { body: "We roast coffee." }) }))).toBe(true);
    expect(blockHasContent(block({ type: "media", data: defaultBlockData("media", { label: "Wordmark" }) }))).toBe(false);
  });

  it("hides hidden and empty pages from clients", () => {
    const filled = page({ id: "a", intro: "Our logo." });
    const hidden = page({ id: "b", intro: "Secret.", isHidden: true });
    const empty = page({ id: "c" });
    expect(clientPages([filled, hidden, empty]).map((p) => p.id)).toEqual(["a"]);
  });

  it("serves prepared downloads only while their page is visible", () => {
    const portal = { logoFileId: "logo", coverFileId: null, wordmarkFileId: null };
    const download = page({ buttonFileId: "zip" });
    expect(clientPages([download])).toHaveLength(1);
    expect(clientCanReadFile(portal, [download], "zip")).toBe(true);
    expect(clientCanReadFile(portal, [{ ...download, isHidden: true }], "zip")).toBe(false);
    expect(clientCanReadFile(portal, [], "unattached")).toBe(false);
    expect(clientCanReadFile(portal, [], "logo")).toBe(true);
  });

  it("numbers pages from 01", () => {
    expect(pageNumber(0)).toBe("01");
    expect(pageNumber(11)).toBe("12");
  });
});
