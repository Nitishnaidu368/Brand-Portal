"use server";

import { and, asc, eq, inArray, max, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, formFields, ok, zodFail, type ActionState } from "@/lib/action-state";
import { BLOCK_META, BLOCK_SCHEMAS, parseBlockData, serializeBlockData, withTextField } from "@/lib/blocks";
import { runBatch, touchPortal } from "@/lib/data/portals";
import { db } from "@/lib/db";
import { assets, blocks, BLOCK_TYPES, colors, fonts, pages, type BlockType } from "@/lib/db/schema";
import { deleteFileById } from "@/lib/files";
import { RESERVED_PAGE_SLUGS } from "@/lib/guide";
import { starterBlockData } from "@/lib/templates";
import { newId, slugify } from "@/lib/utils";
import { authorizeBlock, authorizePage, authorizePortal, DENIED, hexSchema, refreshAll } from "./guards";

const editorPath = (portalId: string, pageId: string) => `/editor/${portalId}/${pageId}`;

async function done(portalId: string, message?: string) {
  await touchPortal(portalId);
  refreshAll();
  return ok(message);
}

async function deleteBlockFiles(blockIds: string[]) {
  if (blockIds.length === 0) return;
  const [assetFiles, fontFiles] = await Promise.all([
    db.select({ fileId: assets.fileId }).from(assets).where(inArray(assets.blockId, blockIds)),
    db.select({ fileId: fonts.fileId }).from(fonts).where(inArray(fonts.blockId, blockIds)),
  ]);
  for (const { fileId } of [...assetFiles, ...fontFiles]) await deleteFileById(fileId);
}

/* Pages */

const pageTitleSchema = z.string().trim().min(1, "Give the page a title").max(60, "Keep the title under 60 characters");

async function uniquePageSlug(portalId: string, base: string, exceptPageId?: string) {
  const rows = await db.select({ id: pages.id, slug: pages.slug }).from(pages).where(eq(pages.portalId, portalId));
  const taken = new Set(rows.filter((row) => row.id !== exceptPageId).map((row) => row.slug));
  const root = base || "page";
  let slug = root;
  for (let n = 2; taken.has(slug) || RESERVED_PAGE_SLUGS.has(slug); n++) slug = `${root}-${n}`;
  return slug;
}

export async function addPageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizePortal(fields.portalId);
  if (!auth) return DENIED;
  const title = pageTitleSchema.safeParse(fields.title ?? "");
  if (!title.success) return zodFail(title.error);

  const [last] = await db.select({ value: max(pages.position) }).from(pages).where(eq(pages.portalId, auth.portal.id));
  const pageId = newId();
  await runBatch([
    db.insert(pages).values({
      id: pageId,
      portalId: auth.portal.id,
      slug: await uniquePageSlug(auth.portal.id, slugify(title.data)),
      title: title.data,
      position: (last?.value ?? -1) + 1,
    }),
    db.insert(blocks).values({
      id: newId(),
      portalId: auth.portal.id,
      pageId,
      type: "text",
      data: serializeBlockData("text", {}),
      position: 0,
    }),
  ]);
  await touchPortal(auth.portal.id);
  refreshAll();
  redirect(editorPath(auth.portal.id, pageId));
}

const pageSchema = z.object({
  title: pageTitleSchema,
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter a URL")
    .max(48, "Keep it under 48 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single dashes"),
  intro: z.string().max(2000, "Keep the intro under 2000 characters").default(""),
  buttonLabel: z.string().trim().max(40, "Keep the button label under 40 characters").default(""),
});

export async function updatePageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizePage(fields.pageId);
  if (!auth) return DENIED;
  const parsed = pageSchema.safeParse(fields);
  if (!parsed.success) return zodFail(parsed.error);

  const { slug } = parsed.data;
  if (RESERVED_PAGE_SLUGS.has(slug)) return fail("That URL is reserved.", { slug: "Reserved, pick another" });
  const clash = await db.query.pages.findFirst({
    where: and(eq(pages.portalId, auth.portal.id), eq(pages.slug, slug), ne(pages.id, auth.page.id)),
  });
  if (clash) return fail("Another page already uses that URL.", { slug: "Already used by another page" });

  await db
    .update(pages)
    .set({ ...parsed.data, isHidden: fields.isHidden === "on" })
    .where(eq(pages.id, auth.page.id));
  return done(auth.portal.id, "Page saved");
}

/** Inline edits of the page title, intro and button label. */
export async function savePageTextAction(pageId: string, field: string, value: string): Promise<ActionState> {
  const auth = await authorizePage(pageId);
  if (!auth) return DENIED;
  if (typeof value !== "string") return fail("Invalid text.");

  let update: { title: string } | { intro: string } | { buttonLabel: string };
  if (field === "title") {
    const parsed = pageTitleSchema.safeParse(value);
    if (!parsed.success) return zodFail(parsed.error);
    update = { title: parsed.data };
  } else if (field === "intro") {
    const parsed = pageSchema.shape.intro.safeParse(value);
    if (!parsed.success) return zodFail(parsed.error);
    update = { intro: parsed.data };
  } else if (field === "buttonLabel") {
    const parsed = pageSchema.shape.buttonLabel.safeParse(value);
    if (!parsed.success) return zodFail(parsed.error);
    update = { buttonLabel: parsed.data };
  } else {
    return fail("That field can't be edited.");
  }

  await db.update(pages).set(update).where(eq(pages.id, auth.page.id));
  return done(auth.portal.id);
}

export async function deletePageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizePage(fields.pageId);
  if (!auth) return DENIED;

  const pageBlocks = await db.select({ id: blocks.id }).from(blocks).where(eq(blocks.pageId, auth.page.id));
  await deleteBlockFiles(pageBlocks.map((b) => b.id));
  await deleteFileById(auth.page.buttonFileId);
  await db.delete(pages).where(eq(pages.id, auth.page.id));

  const next = await db.query.pages.findFirst({
    where: eq(pages.portalId, auth.portal.id),
    orderBy: [asc(pages.position), asc(pages.createdAt)],
  });
  await touchPortal(auth.portal.id);
  refreshAll();
  redirect(next ? editorPath(auth.portal.id, next.id) : `/dashboard/portals/${auth.portal.id}`);
}

export async function reorderPagesAction(portalId: string, orderedIds: string[]): Promise<ActionState> {
  const auth = await authorizePortal(portalId);
  if (!auth) return DENIED;
  if (!Array.isArray(orderedIds) || !orderedIds.every((id) => typeof id === "string")) return fail("Invalid order.");

  const current = await db.select({ id: pages.id }).from(pages).where(eq(pages.portalId, auth.portal.id));
  const known = new Set(current.map((p) => p.id));
  if (orderedIds.length !== known.size || !orderedIds.every((id) => known.has(id))) {
    return fail("Pages changed while you were reordering. Refresh and try again.");
  }
  await runBatch(orderedIds.map((id, position) => db.update(pages).set({ position }).where(eq(pages.id, id))));
  return done(auth.portal.id);
}

export async function removePageFileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizePage(fields.pageId);
  if (!auth) return DENIED;
  await db.update(pages).set({ buttonFileId: null }).where(eq(pages.id, auth.page.id));
  await deleteFileById(auth.page.buttonFileId);
  return done(auth.portal.id, "File removed");
}

/* Blocks */

async function pageBlockIds(pageId: string) {
  const rows = await db
    .select({ id: blocks.id })
    .from(blocks)
    .where(eq(blocks.pageId, pageId))
    .orderBy(asc(blocks.position), asc(blocks.createdAt));
  return rows.map((row) => row.id);
}

const reorderBlocks = (order: string[]) =>
  order.map((id, position) => db.update(blocks).set({ position }).where(eq(blocks.id, id)));

export async function addBlockAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizePage(fields.pageId);
  if (!auth) return DENIED;
  const type = BLOCK_TYPES.find((t) => t === fields.type);
  if (!type) return fail("Choose a block type.");

  const order = await pageBlockIds(auth.page.id);
  const requested = Number.parseInt(fields.index ?? "", 10);
  const at = Number.isInteger(requested) ? Math.min(Math.max(requested, 0), order.length) : order.length;
  const blockId = newId();
  order.splice(at, 0, blockId);

  await runBatch([
    db.insert(blocks).values({
      id: blockId,
      portalId: auth.portal.id,
      pageId: auth.page.id,
      type,
      data: serializeBlockData(type, starterBlockData(type)),
      position: at,
    }),
    ...reorderBlocks(order),
  ]);
  await touchPortal(auth.portal.id);
  refreshAll();
  redirect(`${editorPath(auth.portal.id, auth.page.id)}?block=${blockId}`);
}

/** Inline edits of block text: header fields, or list item fields like "items.2.title". */
export async function saveBlockTextAction(blockId: string, path: string, value: string): Promise<ActionState> {
  const auth = await authorizeBlock(blockId);
  if (!auth) return DENIED;
  if (typeof path !== "string" || typeof value !== "string") return fail("Invalid text.");

  const { block } = auth;
  const next = withTextField(block.type, parseBlockData(block.type, block.data), path, value);
  if (!next) return fail("That text couldn't be saved. It may be too long.");
  await db.update(blocks).set({ data: JSON.stringify(next) }).where(eq(blocks.id, block.id));
  return done(auth.portal.id);
}

type SettingSpec = { ints?: string[]; choices?: string[]; flags?: string[]; strings?: string[] };

const BLOCK_SETTINGS: Record<BlockType, SettingSpec> = {
  text: {},
  cards: { ints: ["columns"] },
  media: { ints: ["columns"], choices: ["background", "aspect", "fit"], flags: ["band", "downloadable"] },
  colors: { ints: ["columns"], choices: ["height"], flags: ["exportable"] },
  pairings: { ints: ["columns"] },
  typeface: { flags: ["characters", "tester"] },
  typescale: { choices: ["background"], strings: ["font"] },
  icons: {},
  banners: {},
  files: {},
};

export async function updateBlockSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizeBlock(fields.blockId);
  if (!auth) return DENIED;
  const { block } = auth;
  const spec = BLOCK_SETTINGS[block.type];

  if (block.type === "typescale" && fields.font && !/^[A-Za-z0-9 ]{1,60}$/.test(fields.font.trim())) {
    return fail("Use a Google Fonts family name, e.g. Inter.", { font: "Letters, numbers and spaces only" });
  }

  const data = parseBlockData(block.type, block.data) as Record<string, unknown>;
  for (const key of ["size", ...(spec.choices ?? []), ...(spec.strings ?? [])]) {
    if (key in fields) data[key] = fields[key].trim();
  }
  for (const key of spec.ints ?? []) {
    if (key in fields) data[key] = Number.parseInt(fields[key], 10);
  }
  // Checkboxes are only sent when ticked.
  for (const key of ["divider", ...(spec.flags ?? [])]) data[key] = fields[key] === "on";

  await db
    .update(blocks)
    .set({ data: JSON.stringify(BLOCK_SCHEMAS[block.type].parse(data)) })
    .where(eq(blocks.id, block.id));
  return done(auth.portal.id, "Saved");
}

export async function moveBlockAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizeBlock(fields.blockId);
  if (!auth) return DENIED;

  const order = await pageBlockIds(auth.block.pageId);
  const from = order.indexOf(auth.block.id);
  const to = fields.direction === "up" ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= order.length) return ok();
  [order[from], order[to]] = [order[to], order[from]];
  await runBatch(reorderBlocks(order));
  return done(auth.portal.id);
}

export async function duplicateBlockAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizeBlock(fields.blockId);
  if (!auth) return DENIED;
  const { block, portal } = auth;
  const items = BLOCK_META[block.type].items;
  if (items === "assets" || items === "fonts") {
    return fail("Blocks with uploaded files can't be duplicated. Add a new block and upload to it instead.");
  }

  const order = await pageBlockIds(block.pageId);
  const copyId = newId();
  order.splice(order.indexOf(block.id) + 1, 0, copyId);
  const blockColors = items === "colors" ? await db.select().from(colors).where(eq(colors.blockId, block.id)) : [];

  await runBatch([
    db.insert(blocks).values({ id: copyId, portalId: portal.id, pageId: block.pageId, type: block.type, data: block.data }),
    ...blockColors.map(({ id: _id, createdAt: _createdAt, ...color }) =>
      db.insert(colors).values({ ...color, id: newId(), blockId: copyId }),
    ),
    ...reorderBlocks(order),
  ]);
  return done(portal.id, "Block duplicated");
}

export async function deleteBlockAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizeBlock(fields.blockId);
  if (!auth) return DENIED;
  await deleteBlockFiles([auth.block.id]);
  await db.delete(blocks).where(eq(blocks.id, auth.block.id));
  return done(auth.portal.id);
}

/* List items stored in block data: text grid cards, color pairings, type scale rows */

const LIST_ITEM_SCHEMAS = {
  cards: z.object({
    title: z.string().max(160, "Keep the title under 160 characters").default(""),
    body: z.string().max(4000, "Keep the text under 4000 characters").default(""),
  }),
  pairings: z.object({ background: hexSchema, foreground: hexSchema }),
  typescale: z.object({
    text: z.string().max(300, "Keep the sample under 300 characters").default(""),
    label: z.string().max(80).default(""),
    fontId: z.string().max(80).default(""),
    size: z.coerce.number().int("Use a whole number").min(10, "Use a size from 10 to 200").max(200, "Use a size from 10 to 200"),
    weight: z.coerce.number().int().min(100, "Use a weight from 100 to 900").max(900, "Use a weight from 100 to 900"),
  }),
};
type ListBlockType = keyof typeof LIST_ITEM_SCHEMAS;

const NEW_LIST_ITEM: Record<ListBlockType, Record<string, unknown>> = {
  cards: { title: "", body: "" },
  pairings: { background: "#FFFFFF", foreground: "#011520" },
  typescale: { text: "Sample text", label: "Style", fontId: "", size: 32, weight: 400 },
};
const MAX_LIST_ITEMS: Record<ListBlockType, number> = { cards: 24, pairings: 48, typescale: 12 };

async function authorizeListBlock(blockId: unknown) {
  const auth = await authorizeBlock(blockId);
  if (!auth || !Object.hasOwn(LIST_ITEM_SCHEMAS, auth.block.type)) return null;
  const type = auth.block.type as ListBlockType;
  const data = parseBlockData(type, auth.block.data);
  return { ...auth, type, data, items: [...data.items] as Record<string, unknown>[] };
}

async function saveListItems(auth: NonNullable<Awaited<ReturnType<typeof authorizeListBlock>>>, items: unknown[], message?: string) {
  await db
    .update(blocks)
    .set({ data: serializeBlockData(auth.type, { ...auth.data, items }) })
    .where(eq(blocks.id, auth.block.id));
  return done(auth.portal.id, message);
}

export async function addListItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizeListBlock(fields.blockId);
  if (!auth) return DENIED;
  const limit = MAX_LIST_ITEMS[auth.type];
  if (auth.items.length >= limit) return fail(`This block holds up to ${limit} items.`);
  return saveListItems(auth, [...auth.items, NEW_LIST_ITEM[auth.type]]);
}

export async function updateListItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizeListBlock(fields.blockId);
  if (!auth) return DENIED;
  const index = Number.parseInt(fields.index ?? "", 10);
  if (!auth.items[index]) return fail("That item no longer exists. Refresh and try again.");
  const parsed = LIST_ITEM_SCHEMAS[auth.type].safeParse(fields);
  if (!parsed.success) return zodFail(parsed.error);
  if (auth.type === "typescale" && "fontId" in parsed.data && parsed.data.fontId) {
    const font = await db.query.fonts.findFirst({
      where: and(eq(fonts.id, parsed.data.fontId), eq(fonts.portalId, auth.portal.id)),
    });
    if (!font) return fail("That font is no longer available. Refresh and try again.");
  }
  const items = [...auth.items];
  items[index] = parsed.data;
  return saveListItems(auth, items, "Saved");
}

export async function removeListItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizeListBlock(fields.blockId);
  if (!auth) return DENIED;
  const index = Number.parseInt(fields.index ?? "", 10);
  if (!auth.items[index]) return ok();
  return saveListItems(
    auth,
    auth.items.filter((_, i) => i !== index),
  );
}

export async function moveListItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizeListBlock(fields.blockId);
  if (!auth) return DENIED;
  const from = Number.parseInt(fields.index ?? "", 10);
  const to = fields.direction === "up" ? from - 1 : from + 1;
  if (!auth.items[from] || !auth.items[to]) return ok();
  const items = [...auth.items];
  [items[from], items[to]] = [items[to], items[from]];
  return saveListItems(auth, items);
}
