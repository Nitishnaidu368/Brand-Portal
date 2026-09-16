import "server-only";
import { and, asc, count, countDistinct, desc, eq, gte, inArray, max } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { cache } from "react";
import { parseBlockData } from "@/lib/blocks";
import { db } from "@/lib/db";
import { assets, blocks, colors, downloadLog, files, fonts, pages, portals } from "@/lib/db/schema";
import { publicFile } from "@/lib/files";
import type { GuideBlock, GuidePage } from "@/lib/guide";
import { newId } from "@/lib/utils";

export async function listPortals(agencyId: string) {
  const rows = await db.select().from(portals).where(eq(portals.agencyId, agencyId)).orderBy(desc(portals.updatedAt));
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [pageCounts, assetCounts, colorCounts, downloads] = await Promise.all([
    db.select({ portalId: pages.portalId, n: count() }).from(pages).where(inArray(pages.portalId, ids)).groupBy(pages.portalId),
    db.select({ portalId: assets.portalId, n: count() }).from(assets).where(inArray(assets.portalId, ids)).groupBy(assets.portalId),
    db.select({ portalId: colors.portalId, n: count() }).from(colors).where(inArray(colors.portalId, ids)).groupBy(colors.portalId),
    db
      .select({ portalId: downloadLog.portalId, n: count() })
      .from(downloadLog)
      .where(and(inArray(downloadLog.portalId, ids), gte(downloadLog.createdAt, since)))
      .groupBy(downloadLog.portalId),
  ]);
  const lookup = (list: { portalId: string; n: number }[]) => new Map(list.map((r) => [r.portalId, r.n]));
  const pageMap = lookup(pageCounts);
  const assetMap = lookup(assetCounts);
  const colorMap = lookup(colorCounts);
  const downloadMap = lookup(downloads);

  return rows.map(({ passwordHash: _omit, ...portal }) => ({
    ...portal,
    pageCount: pageMap.get(portal.id) ?? 0,
    assetCount: assetMap.get(portal.id) ?? 0,
    colorCount: colorMap.get(portal.id) ?? 0,
    downloads30d: downloadMap.get(portal.id) ?? 0,
  }));
}

export async function getRecentDownloads(agencyId: string, limit = 8) {
  return db
    .select({
      id: downloadLog.id,
      label: downloadLog.label,
      format: downloadLog.format,
      actor: downloadLog.actor,
      kind: downloadLog.kind,
      createdAt: downloadLog.createdAt,
      portalId: portals.id,
      portalName: portals.clientName,
    })
    .from(downloadLog)
    .innerJoin(portals, eq(downloadLog.portalId, portals.id))
    .where(eq(portals.agencyId, agencyId))
    .orderBy(desc(downloadLog.createdAt))
    .limit(limit);
}

export async function getPortalActivity(portalId: string) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [recent, [totals], [lastWeek], top] = await Promise.all([
    db.select().from(downloadLog).where(eq(downloadLog.portalId, portalId)).orderBy(desc(downloadLog.createdAt)).limit(200),
    db
      .select({ total: count(), people: countDistinct(downloadLog.actor), last: max(downloadLog.createdAt) })
      .from(downloadLog)
      .where(eq(downloadLog.portalId, portalId)),
    db
      .select({ n: count() })
      .from(downloadLog)
      .where(and(eq(downloadLog.portalId, portalId), gte(downloadLog.createdAt, weekAgo))),
    db
      .select({ label: downloadLog.label, n: count() })
      .from(downloadLog)
      .where(eq(downloadLog.portalId, portalId))
      .groupBy(downloadLog.label)
      .orderBy(desc(count()))
      .limit(5),
  ]);
  return { recent, total: totals?.total ?? 0, people: totals?.people ?? 0, lastWeek: lastWeek?.n ?? 0, top };
}

function groupBy<T>(rows: T[], key: (row: T) => string) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k);
    if (list) list.push(row);
    else map.set(k, [row]);
  }
  return map;
}

/**
 * Every page of a portal in nav order, each with its blocks and their colors, assets and fonts.
 * Cached per request, so metadata and the page share one load.
 */
export const getGuide = cache(async (portalId: string): Promise<GuidePage[]> => {
  const [pageRows, blockRows, colorRows, assetRows, fontRows] = await Promise.all([
    db.select().from(pages).where(eq(pages.portalId, portalId)).orderBy(asc(pages.position), asc(pages.createdAt)),
    db.select().from(blocks).where(eq(blocks.portalId, portalId)).orderBy(asc(blocks.position), asc(blocks.createdAt)),
    db.select().from(colors).where(eq(colors.portalId, portalId)).orderBy(asc(colors.position), asc(colors.createdAt)),
    db
      .select({ asset: assets, file: files })
      .from(assets)
      .innerJoin(files, eq(assets.fileId, files.id))
      .where(eq(assets.portalId, portalId))
      .orderBy(asc(assets.position), asc(assets.createdAt)),
    db
      .select({ font: fonts, file: files })
      .from(fonts)
      .leftJoin(files, eq(fonts.fileId, files.id))
      .where(eq(fonts.portalId, portalId))
      .orderBy(asc(fonts.position), asc(fonts.createdAt)),
  ]);

  const colorsByBlock = groupBy(colorRows, (c) => c.blockId);
  const assetsByBlock = groupBy(
    assetRows.map(({ asset, file }) => ({ ...asset, file: publicFile(file) })),
    (a) => a.blockId,
  );
  const fontsByBlock = groupBy(
    fontRows.map(({ font, file }) => ({ ...font, file: file ? publicFile(file) : null })),
    (f) => f.blockId,
  );
  const blocksByPage = groupBy(
    blockRows.map(
      (block) =>
        ({
          id: block.id,
          portalId: block.portalId,
          pageId: block.pageId,
          type: block.type,
          position: block.position,
          data: parseBlockData(block.type, block.data),
          colors: colorsByBlock.get(block.id) ?? [],
          assets: assetsByBlock.get(block.id) ?? [],
          fonts: fontsByBlock.get(block.id) ?? [],
        }) as GuideBlock,
    ),
    (b) => b.pageId,
  );

  return pageRows.map((page) => ({ ...page, blocks: blocksByPage.get(page.id) ?? [] }));
});

export async function logDownload(entry: {
  portalId: string;
  assetId?: string | null;
  kind: "asset" | "zip" | "colors" | "font";
  label: string;
  format?: string;
  actor: string;
}) {
  await db.insert(downloadLog).values({
    id: newId(),
    portalId: entry.portalId,
    assetId: entry.assetId ?? null,
    kind: entry.kind,
    label: entry.label,
    format: entry.format ?? "",
    actor: entry.actor,
  });
}

type Positioned = typeof colors | typeof assets | typeof fonts;

export async function nextPosition(table: Positioned, blockId: string) {
  const t = table as typeof colors;
  const [row] = await db.select({ value: max(t.position) }).from(t).where(eq(t.blockId, blockId));
  return (row?.value ?? -1) + 1;
}

export async function runBatch(queries: BatchItem<"sqlite">[]) {
  if (queries.length === 0) return;
  await db.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
}

export async function touchPortal(portalId: string) {
  await db.update(portals).set({ updatedAt: new Date() }).where(eq(portals.id, portalId));
}
