import type { BlockData } from "./blocks";
import type { Asset, BlockType, Color, Font, Page } from "./db/schema";
import type { PublicFile } from "./files";

export type GuideAsset = Asset & { file: PublicFile };
export type GuideFont = Font & { file: PublicFile | null };

type BlockOf<T extends BlockType> = {
  id: string;
  portalId: string;
  pageId: string;
  type: T;
  position: number;
  data: BlockData<T>;
  colors: Color[];
  assets: GuideAsset[];
  fonts: GuideFont[];
};

/** A block with its parsed settings and items, discriminated by `type`. */
export type GuideBlock = { [T in BlockType]: BlockOf<T> }[BlockType];
export type GuidePage = Page & { blocks: GuideBlock[] };

/** Page URLs that would collide with the portal's own routes. */
export const RESERVED_PAGE_SLUGS = new Set(["login", "invite"]);

/** Whether a block has anything for a client to see. Empty blocks stay visible in the editor only. */
export function blockHasContent(block: GuideBlock) {
  switch (block.type) {
    case "text":
      // A label on its own is only a heading waiting for its text.
      return Boolean(block.data.body.trim());
    case "cards":
      return block.data.items.some((item) => item.title.trim() || item.body.trim());
    case "pairings":
      return block.data.items.length > 0;
    case "typescale":
      return block.data.items.some((item) => item.text.trim());
    case "colors":
      return block.colors.length > 0;
    case "typeface":
      return block.fonts.length > 0;
    default:
      return block.assets.length > 0;
  }
}

export function pageHasContent(page: GuidePage) {
  return Boolean(page.intro.trim()) || page.blocks.some(blockHasContent);
}

/** Pages clients can open, in nav order: not hidden, and with something on them. */
export function clientPages(pages: GuidePage[]) {
  return pages.filter((page) => !page.isHidden && pageHasContent(page));
}

/** "01", "02", … */
export function pageNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}
