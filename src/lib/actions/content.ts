"use server";

import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { fail, formFields, ok, zodFail, type ActionState } from "@/lib/action-state";
import { nextPosition, runBatch, touchPortal } from "@/lib/data/portals";
import { db } from "@/lib/db";
import { ASSET_VARIANTS, assets, colors, files, fonts } from "@/lib/db/schema";
import { deleteFile } from "@/lib/files";
import { parseWeights } from "@/lib/fonts";
import { newId } from "@/lib/utils";
import { authorizeBlock, authorizePortal, DENIED, hexSchema, refreshAll } from "./guards";

/* Colors */

const colorSchema = z.object({
  name: z.string().trim().min(1, "Name this color").max(60),
  hex: hexSchema,
  pantone: z.string().trim().max(40).default(""),
  cmyk: z
    .string()
    .trim()
    .max(40)
    .default("")
    .refine((v) => v === "" || /^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}$/.test(v), "Use four numbers, e.g. 90, 45, 55, 60"),
  usage: z.string().trim().max(200).default(""),
});

function colorValuesFrom(data: z.infer<typeof colorSchema>) {
  return {
    name: data.name,
    hex: data.hex,
    pantone: data.pantone || null,
    cmyk: data.cmyk ? data.cmyk.split(",").map((n) => n.trim()).join(", ") : null,
    usage: data.usage,
  };
}

export async function addColorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizeBlock(fields.blockId);
  if (!auth || auth.block.type !== "colors") return DENIED;
  const parsed = colorSchema.safeParse(fields);
  if (!parsed.success) return zodFail(parsed.error);

  await db.insert(colors).values({
    id: newId(),
    portalId: auth.portal.id,
    blockId: auth.block.id,
    position: await nextPosition(colors, auth.block.id),
    ...colorValuesFrom(parsed.data),
  });
  await touchPortal(auth.portal.id);
  refreshAll();
  return ok(`${parsed.data.name} added`);
}

async function authorizeItem<T extends typeof colors | typeof assets | typeof fonts>(table: T, id: unknown) {
  if (typeof id !== "string") return null;
  const t = table as unknown as typeof colors;
  const [item] = await db.select({ portalId: t.portalId, blockId: t.blockId }).from(t).where(eq(t.id, id)).limit(1);
  if (!item) return null;
  const auth = await authorizePortal(item.portalId);
  return auth ? { ...auth, blockId: item.blockId } : null;
}

export async function updateColorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizeItem(colors, fields.colorId);
  if (!auth) return DENIED;
  const parsed = colorSchema.safeParse(fields);
  if (!parsed.success) return zodFail(parsed.error);

  await db.update(colors).set(colorValuesFrom(parsed.data)).where(eq(colors.id, fields.colorId));
  await touchPortal(auth.portal.id);
  refreshAll();
  return ok("Saved");
}

export async function deleteColorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizeItem(colors, fields.colorId);
  if (!auth) return DENIED;
  await db.delete(colors).where(eq(colors.id, fields.colorId));
  await touchPortal(auth.portal.id);
  refreshAll();
  return ok();
}

/* Reordering colors, assets and fonts within a block */

const TABLES = { color: colors, asset: assets, font: fonts } as const;

export async function moveItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const kind = fields.kind as keyof typeof TABLES;
  if (!Object.hasOwn(TABLES, kind)) return fail("Unknown item.");
  const table = TABLES[kind] as unknown as typeof colors;

  const auth = await authorizeItem(table, fields.id);
  if (!auth) return DENIED;

  const siblings = await db
    .select({ id: table.id })
    .from(table)
    .where(eq(table.blockId, auth.blockId))
    .orderBy(asc(table.position), asc(table.createdAt));
  const from = siblings.findIndex((s) => s.id === fields.id);
  const to = fields.direction === "up" ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= siblings.length) return ok();

  [siblings[from], siblings[to]] = [siblings[to], siblings[from]];
  await runBatch(siblings.map((s, position) => db.update(table).set({ position }).where(eq(table.id, s.id))));
  refreshAll();
  return ok();
}

/* Assets (images, icons, banners, downloads) */

const assetSchema = z.object({
  name: z.string().trim().min(1, "Give this asset a name").max(100),
  description: z.string().trim().max(300).default(""),
  groupLabel: z.string().trim().max(60).default(""),
  variant: z.enum(ASSET_VARIANTS).default("default"),
});

export async function updateAssetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizeItem(assets, fields.assetId);
  if (!auth) return DENIED;
  const parsed = assetSchema.safeParse(fields);
  if (!parsed.success) return zodFail(parsed.error);

  await db.update(assets).set(parsed.data).where(eq(assets.id, fields.assetId));
  await touchPortal(auth.portal.id);
  refreshAll();
  return ok("Saved");
}

export async function deleteAssetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizeItem(assets, fields.assetId);
  if (!auth) return DENIED;

  const [row] = await db
    .select({ file: files })
    .from(assets)
    .innerJoin(files, eq(assets.fileId, files.id))
    .where(and(eq(assets.id, fields.assetId), eq(assets.portalId, auth.portal.id)));
  // Deleting the file cascades to the asset row.
  if (row) await deleteFile(row.file);
  else await db.delete(assets).where(eq(assets.id, fields.assetId));
  await touchPortal(auth.portal.id);
  refreshAll();
  return ok();
}

/* Fonts */

const fontSchema = z.object({
  family: z
    .string()
    .trim()
    .min(1, "Enter the font family")
    .max(60)
    .regex(/^[A-Za-z0-9 ]+$/, "Use letters, numbers and spaces only"),
  weights: z
    .string()
    .trim()
    .default("400")
    .refine((v) => parseWeights(v).length > 0, "List weights between 100 and 900, e.g. 400, 700"),
  style: z.enum(["normal", "italic"]).default("normal"),
  usage: z.string().trim().max(200).default(""),
});

export async function addGoogleFontAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizeBlock(fields.blockId);
  if (!auth || auth.block.type !== "typeface") return DENIED;
  const parsed = fontSchema.safeParse(fields);
  if (!parsed.success) return zodFail(parsed.error);

  await db.insert(fonts).values({
    id: newId(),
    portalId: auth.portal.id,
    blockId: auth.block.id,
    source: "google",
    family: parsed.data.family,
    weights: parseWeights(parsed.data.weights).join(", "),
    style: "normal",
    usage: parsed.data.usage,
    position: await nextPosition(fonts, auth.block.id),
  });
  await touchPortal(auth.portal.id);
  refreshAll();
  return ok(`${parsed.data.family} added`);
}

export async function updateFontAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizeItem(fonts, fields.fontId);
  if (!auth) return DENIED;
  const parsed = fontSchema.safeParse(fields);
  if (!parsed.success) return zodFail(parsed.error);

  await db
    .update(fonts)
    .set({ ...parsed.data, weights: parseWeights(parsed.data.weights).join(", ") })
    .where(eq(fonts.id, fields.fontId));
  await touchPortal(auth.portal.id);
  refreshAll();
  return ok("Saved");
}

export async function deleteFontAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizeItem(fonts, fields.fontId);
  if (!auth) return DENIED;

  const font = await db.query.fonts.findFirst({ where: eq(fonts.id, fields.fontId) });
  const file = font?.fileId ? await db.query.files.findFirst({ where: eq(files.id, font.fileId) }) : null;
  await db.delete(fonts).where(eq(fonts.id, fields.fontId));
  if (file) await deleteFile(file);
  await touchPortal(auth.portal.id);
  refreshAll();
  return ok();
}
