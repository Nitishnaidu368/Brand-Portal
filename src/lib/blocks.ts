import { z } from "zod";
import { normalizeHex } from "./color";
import type { BlockType } from "./db/schema";

/*
 * Block data is stored as JSON. Every field has a default and falls back to it when the stored
 * value is missing or invalid, so parsing never throws and older rows pick up new settings.
 */

const str = (max: number) => z.string().max(max).default("").catch("");
const bool = (fallback: boolean) => z.boolean().default(fallback).catch(fallback);
const int = (min: number, max: number, fallback: number) => z.number().int().min(min).max(max).default(fallback).catch(fallback);
const choice = <const T extends readonly [string, ...string[]]>(values: T, fallback: T[number]) =>
  z.enum(values).default(fallback).catch(fallback);
const hex = (fallback: string) =>
  z
    .string()
    .transform((value, ctx) => normalizeHex(value) ?? (ctx.addIssue({ code: "custom", message: "Invalid color" }), z.NEVER))
    .default(fallback)
    .catch(fallback);
const list = <T extends z.ZodType>(item: T, max: number) => z.array(item).max(max).default([]).catch([]);

/** The row at the top of most blocks: label and grey sub-label on the left, text on the right. */
const header = {
  label: str(160),
  sublabel: str(160),
  body: str(20000),
  /** "lg" is the 20px strategy style; "sm" the 14px style used on most pages. */
  size: choice(["sm", "lg"], "sm"),
  /** Thin rule above the block. */
  divider: bool(true),
};

export const TILE_BACKGROUNDS = ["none", "grey", "white", "dark"] as const;
export const ASPECTS = ["auto", "16/9", "3/2", "4/3", "1/1", "3/4"] as const;

const card = z.object({ title: str(160), body: str(4000) });
const pairing = z.object({ background: hex("#011520"), foreground: hex("#FFFFFF") });
const scaleRow = z.object({ text: str(300), label: str(80), fontId: str(80), size: int(10, 200, 48), weight: int(100, 900, 400) });

export const BLOCK_SCHEMAS = {
  text: z.object({ ...header }),
  cards: z.object({ ...header, columns: int(1, 4, 3), items: list(card, 24) }),
  media: z.object({
    ...header,
    columns: int(1, 4, 2),
    background: choice(TILE_BACKGROUNDS, "grey"),
    aspect: choice(ASPECTS, "16/9"),
    fit: choice(["contain", "cover"], "contain"),
    /** Full-width light grey band behind the images. */
    band: bool(false),
    downloadable: bool(true),
  }),
  colors: z.object({
    ...header,
    /** Swatches per row; 0 puts every color in a single row. */
    columns: int(0, 6, 0),
    height: choice(["tall", "short"], "tall"),
    exportable: bool(true),
  }),
  pairings: z.object({ ...header, columns: int(2, 6, 4), items: list(pairing, 48) }),
  typeface: z.object({ ...header, characters: bool(true), tester: bool(false) }),
  typescale: z.object({
    ...header,
    font: z
      .string()
      .max(60)
      .regex(/^[A-Za-z0-9 ]*$/)
      .default("")
      .catch(""),
    background: choice(["dark", "light"], "dark"),
    items: list(scaleRow, 12),
  }),
  icons: z.object({ ...header }),
  banners: z.object({ ...header }),
  files: z.object({ ...header }),
} satisfies Record<BlockType, z.ZodType>;

export type BlockData<T extends BlockType = BlockType> = z.output<(typeof BLOCK_SCHEMAS)[T]>;
export type AnyBlockData = { [T in BlockType]: BlockData<T> }[BlockType];

export function parseBlockData<T extends BlockType>(type: T, raw: string | null | undefined): BlockData<T> {
  let value: unknown = {};
  try {
    value = raw ? JSON.parse(raw) : {};
  } catch {
    // corrupt JSON falls back to defaults
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) value = {};
  return BLOCK_SCHEMAS[type].parse(value) as BlockData<T>;
}

export function defaultBlockData<T extends BlockType>(type: T, overrides: Record<string, unknown> = {}): BlockData<T> {
  return BLOCK_SCHEMAS[type].parse(overrides) as BlockData<T>;
}

export function serializeBlockData<T extends BlockType>(type: T, data: unknown) {
  return JSON.stringify(BLOCK_SCHEMAS[type].parse(data));
}

type ItemKind = "colors" | "assets" | "fonts";

export const BLOCK_META: Record<BlockType, { label: string; description: string; items?: ItemKind }> = {
  text: { label: "Text", description: "A label with a paragraph beside it" },
  cards: { label: "Text grid", description: "Titles and short paragraphs in columns" },
  media: { label: "Images & video", description: "Logos, diagrams, photos or motion in a grid", items: "assets" },
  colors: { label: "Color swatches", description: "Click-to-copy HEX, RGB and CMYK", items: "colors" },
  pairings: { label: "Color pairings", description: "Background and text pairs with AA/AAA ratings" },
  typeface: { label: "Typeface", description: "Character sets for each weight, with downloads", items: "fonts" },
  typescale: { label: "Type scale", description: "Sample text for each style, e.g. Display or Body" },
  icons: { label: "Icon set", description: "Searchable icons with copy-as-SVG", items: "assets" },
  banners: { label: "Banners", description: "Social and web artwork grouped by platform", items: "assets" },
  files: { label: "Downloads", description: "Templates, documents and source files", items: "assets" },
};

export function blockItemKind(type: BlockType) {
  return BLOCK_META[type].items;
}

/** Text fields editable in place: header fields on every block, plus these fields of list items. */
const ITEM_TEXT_FIELDS: Partial<Record<BlockType, readonly string[]>> = {
  cards: ["title", "body"],
  typescale: ["text", "label"],
};
const HEADER_TEXT_FIELDS = ["label", "sublabel", "body"] as const;

/**
 * Returns block data with one text field replaced, or null if the path isn't an editable text
 * field of this block type. Paths are "label" or "items.<index>.<field>".
 */
export function withTextField<T extends BlockType>(type: T, data: BlockData<T>, path: string, value: string): BlockData<T> | null {
  const next = structuredClone(data) as Record<string, unknown>;
  let read: (saved: Record<string, unknown>) => unknown;
  if ((HEADER_TEXT_FIELDS as readonly string[]).includes(path)) {
    next[path] = value;
    read = (saved) => saved[path];
  } else {
    const match = /^items\.(\d+)\.([a-z]+)$/.exec(path);
    const fields = ITEM_TEXT_FIELDS[type];
    if (!match || !fields?.includes(match[2])) return null;
    const [, index, field] = match;
    const item = (next.items as Record<string, unknown>[] | undefined)?.[Number(index)];
    if (!item) return null;
    item[field] = value;
    read = (saved) => (saved.items as Record<string, unknown>[])[Number(index)]?.[field];
  }
  const parsed = BLOCK_SCHEMAS[type].safeParse(next);
  // Invalid values fall back to their defaults instead of failing, so check the new text survived.
  if (!parsed.success || read(parsed.data as Record<string, unknown>) !== value) return null;
  return parsed.data as BlockData<T>;
}

/** WCAG rating for a pairing's contrast ratio (normal-size text). */
export function contrastRating(ratio: number) {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Fail";
}
