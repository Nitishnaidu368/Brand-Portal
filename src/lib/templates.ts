import type { BlockType } from "./db/schema";

type TemplateBlock = { type: BlockType; data?: Record<string, unknown> };
export type TemplatePage = { slug: string; title: string; buttonLabel?: string; blocks: TemplateBlock[] };

const text = (data: Record<string, unknown>): TemplateBlock => ({ type: "text", data });
const media = (data: Record<string, unknown>): TemplateBlock => ({ type: "media", data });
const colors = (data: Record<string, unknown>): TemplateBlock => ({ type: "colors", data });

const emptyCards = (n: number) => Array.from({ length: n }, () => ({ title: "", body: "" }));

/**
 * The chapter structure of a full visual identity guideline. Labels are set, but intros, text and
 * uploads are empty, so clients only see a page once you've filled it in.
 */
export function guideTemplate(): TemplatePage[] {
  return [
    {
      slug: "strategy",
      title: "Strategy",
      blocks: [
        text({ sublabel: "Brand Concept", size: "lg" }),
        text({ sublabel: "Mission", size: "lg" }),
        text({ sublabel: "Purpose", size: "lg" }),
        text({ sublabel: "Vision", size: "lg" }),
        { type: "cards", data: { sublabel: "Brand Values", size: "lg", columns: 3, items: emptyCards(6) } },
        text({ sublabel: "Personality", size: "lg" }),
        text({ sublabel: "Core Emotion", size: "lg" }),
        media({ label: "Brand Framework", size: "lg", columns: 1, background: "none", aspect: "auto", downloadable: false }),
      ],
    },
    {
      slug: "logo",
      title: "Logo",
      buttonLabel: "Download Logos",
      blocks: [
        media({ divider: false, columns: 1, background: "dark" }),
        media({ label: "Logo", columns: 1 }),
        media({ label: "Wordmark", columns: 1 }),
        media({ label: "Primary Lock-up", columns: 1 }),
        media({ label: "Logo and lock-up suite", columns: 3, aspect: "3/2" }),
        media({ label: "Exclusion zones", columns: 2, aspect: "3/2", downloadable: false }),
        media({ label: "Logo Construction and Concept", columns: 2, background: "dark", downloadable: false }),
        media({ label: "Logo Scale", columns: 1, aspect: "auto", downloadable: false }),
        media({ label: "Color", columns: 2, aspect: "3/2" }),
      ],
    },
    {
      slug: "sub-brands",
      title: "Sub Brands",
      buttonLabel: "Download Sub Brands",
      blocks: [
        media({ label: "Sub Brands (Product)", sublabel: "Icons", columns: 4, aspect: "1/1" }),
        media({ label: "Sub Brands (Product)", sublabel: "Logos", columns: 2, aspect: "3/2" }),
        media({ label: "Construction", columns: 1, background: "dark", downloadable: false }),
        media({ label: "Sub Brands (Plans)", sublabel: "Logos", columns: 2, aspect: "3/2" }),
      ],
    },
    {
      slug: "typography",
      title: "Typography",
      buttonLabel: "Download Fonts",
      blocks: [
        { type: "typeface", data: { divider: false } },
        media({ label: "Typeface", columns: 1, background: "dark", downloadable: false }),
        { type: "typescale", data: { label: "Weights & styles", items: [] } },
        text({ label: "Typeface settings" }),
        media({ label: "Using Our Typefaces", columns: 1, background: "dark", downloadable: false }),
      ],
    },
    {
      slug: "colour",
      title: "Colour",
      blocks: [
        text({ label: "The basics" }),
        media({ label: "Colour Story", columns: 1, background: "none", fit: "cover", downloadable: false }),
        colors({ label: "Core Brand Colours" }),
        colors({ label: "Secondary Brand Colours", divider: false }),
        colors({ label: "Product Colours", columns: 6 }),
        colors({ label: "Instructional Colours", height: "short" }),
        { type: "pairings", data: { label: "Colour Pairings", items: [] } },
      ],
    },
    {
      slug: "illustrations",
      title: "Illustrations",
      blocks: [
        media({ label: "Style", columns: 1, downloadable: false }),
        media({ label: "Abstract", columns: 4, aspect: "4/3" }),
        media({ divider: false, columns: 2, band: true, background: "white", aspect: "4/3", downloadable: false }),
        media({ label: "Literal", columns: 1, background: "none", aspect: "auto" }),
      ],
    },
    {
      slug: "3d",
      title: "3D",
      buttonLabel: "Download 3D Files",
      blocks: [
        media({ label: "3D language", columns: 1 }),
        media({ label: "3D logos", columns: 2, aspect: "3/2" }),
        media({ label: "Crops, Details and Placements", columns: 3, aspect: "3/2" }),
        media({ label: "Cards", columns: 2, aspect: "3/2" }),
      ],
    },
    {
      slug: "motion",
      title: "Motion",
      buttonLabel: "Download Motion Files",
      blocks: [
        media({ divider: false, columns: 1, background: "none", fit: "cover", downloadable: false }),
        media({ label: "Motion Principles", columns: 3, aspect: "1/1", downloadable: false }),
        text({ label: "Movement" }),
        text({ label: "Easing" }),
        media({ label: "Logo Animation", columns: 1 }),
        media({ label: "Motion Assets", columns: 2 }),
      ],
    },
    {
      slug: "brand-in-use",
      title: "Brand in Use",
      blocks: [media({ divider: false, columns: 1, background: "none", fit: "cover", aspect: "auto", downloadable: false })],
    },
    { slug: "icons", title: "Icons", blocks: [{ type: "icons" }] },
    { slug: "banners", title: "Banners", blocks: [{ type: "banners" }] },
    { slug: "downloads", title: "Downloads", blocks: [{ type: "files" }] },
  ];
}

/** Starting content for a block added in the editor, so there's something to click and edit. */
export function starterBlockData(type: BlockType): Record<string, unknown> {
  switch (type) {
    case "cards":
      return { columns: 3, items: emptyCards(3) };
    case "pairings":
      return {
        items: [
          { background: "#011520", foreground: "#FFFFFF" },
          { background: "#FFFFFF", foreground: "#011520" },
        ],
      };
    case "typescale":
      return {
        items: [
          { text: "Built to unify.", label: "Display", size: 72, weight: 300 },
          { text: "However you want.", label: "Subtitle", size: 36, weight: 400 },
          { text: "Body copy for longer paragraphs and supporting detail.", label: "Paragraph", size: 16, weight: 400 },
        ],
      };
    default:
      return {};
  }
}
