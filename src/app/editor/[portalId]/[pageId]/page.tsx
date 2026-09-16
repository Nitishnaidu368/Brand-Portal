import { eq } from "drizzle-orm";
import { Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { AddBlock, type BlockChoice } from "@/components/editor/add-block";
import { AddPageForm } from "@/components/editor/add-page-form";
import { BlockSettings } from "@/components/editor/block-settings";
import { BlockToolbar } from "@/components/editor/block-toolbar";
import { Drawer } from "@/components/editor/drawer";
import { EditorBar } from "@/components/editor/editor-bar";
import { PageSettings } from "@/components/editor/page-settings";
import { GuideBlockView } from "@/components/guide/blocks";
import { GuideShell } from "@/components/guide/guide-shell";
import { GuideFooter, NextBand, PageHero } from "@/components/guide/page-parts";
import { requireOwnedPortal } from "@/lib/auth/admin";
import { BLOCK_META } from "@/lib/blocks";
import { getGuide } from "@/lib/data/portals";
import { db } from "@/lib/db";
import { BLOCK_TYPES, files } from "@/lib/db/schema";
import { publicFile } from "@/lib/files";
import { pageHasContent, pageNumber } from "@/lib/guide";

const BLOCK_CHOICES: BlockChoice[] = BLOCK_TYPES.map((type) => ({
  type,
  label: BLOCK_META[type].label,
  description: BLOCK_META[type].description,
}));

export async function generateMetadata({ params }: PageProps<"/editor/[portalId]/[pageId]">): Promise<Metadata> {
  const { portalId, pageId } = await params;
  const { portal } = await requireOwnedPortal(portalId);
  const page = (await getGuide(portal.id)).find((p) => p.id === pageId);
  return { title: page ? `Editing ${page.title} · ${portal.clientName}` : "Editor" };
}

/**
 * The guideline editor: the same page clients see, with click-to-edit text, block controls and a
 * settings drawer (?block=<id> or ?panel=page).
 */
export default async function EditorPage({ params, searchParams }: PageProps<"/editor/[portalId]/[pageId]">) {
  const [{ portalId, pageId }, query] = await Promise.all([params, searchParams]);
  const { portal } = await requireOwnedPortal(portalId);
  const guide = await getGuide(portal.id);
  const index = guide.findIndex((p) => p.id === pageId);
  if (index === -1) notFound();

  const page = guide[index];
  const next = guide[(index + 1) % guide.length];
  const selected = typeof query.block === "string" ? page.blocks.find((b) => b.id === query.block) : undefined;
  const pagePanel = !selected && query.panel === "page";
  const buttonFile =
    pagePanel && page.buttonFileId ? await db.query.files.findFirst({ where: eq(files.id, page.buttonFileId) }) : undefined;
  const closeHref = `/editor/${portal.id}/${page.id}`;

  return (
    <GuideShell
      portal={portal}
      items={guide.map((p, i) => ({
        id: p.id,
        label: `${pageNumber(i)} ${p.title}`,
        href: `/editor/${portal.id}/${p.id}`,
        muted: p.isHidden || !pageHasContent(p),
      }))}
      activeId={page.id}
      homeHref={`/editor/${portal.id}`}
      top={<EditorBar portal={portal} page={page} />}
      drawerOpen={Boolean(selected) || pagePanel}
      sidebarFooter={
        <div className="space-y-3">
          <AddPageForm portalId={portal.id} />
          <Link
            href={`/dashboard/portals/${portal.id}/settings`}
            className="inline-flex items-center gap-1.5 font-sans text-[12px] text-guide-muted transition hover:text-black"
          >
            <Settings className="size-3.5" />
            Logo, colors and footer
          </Link>
        </div>
      }
    >
      <PageHero page={page} number={pageNumber(index)} edit buttonHref={null} />
      <main>
        <AddBlock pageId={page.id} index={0} choices={BLOCK_CHOICES} standalone={page.blocks.length === 0} />
        {page.blocks.map((block, i) => (
          <Fragment key={block.id}>
            <GuideBlockView
              block={block}
              ctx={{ edit: true, portalId: portal.id }}
              selected={block.id === selected?.id}
              toolbar={
                <BlockToolbar block={block} first={i === 0} last={i === page.blocks.length - 1} selected={block.id === selected?.id} />
              }
            />
            <AddBlock pageId={page.id} index={i + 1} choices={BLOCK_CHOICES} />
          </Fragment>
        ))}
      </main>
      {guide.length > 1 && <NextBand href={`/editor/${portal.id}/${next.id}`} title={next.title} />}
      <GuideFooter portal={portal} />

      {selected && (
        <Drawer title={BLOCK_META[selected.type].label} description={BLOCK_META[selected.type].description} closeHref={closeHref}>
          <BlockSettings block={selected} />
        </Drawer>
      )}
      {pagePanel && (
        <Drawer title="Page settings" closeHref={closeHref}>
          <PageSettings portal={portal} page={page} buttonFile={buttonFile ? publicFile(buttonFile) : null} />
        </Drawer>
      )}
    </GuideShell>
  );
}
