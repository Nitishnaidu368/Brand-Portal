import { Download, Eye, LogOut, PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GuideBlockView } from "@/components/guide/blocks";
import { GuideShell } from "@/components/guide/guide-shell";
import { GuideFooter, NextBand, PageHero } from "@/components/guide/page-parts";
import { portalLogoutAction } from "@/lib/actions/portal-access";
import { getPortalBySlug, getPortalViewer } from "@/lib/auth/portal";
import { getGuide } from "@/lib/data/portals";
import type { Page, Portal } from "@/lib/db/schema";
import { fileUrl } from "@/lib/formats";
import { blockHasContent, clientPages, pageNumber } from "@/lib/guide";

export async function generateMetadata({ params }: PageProps<"/p/[slug]/[page]">): Promise<Metadata> {
  const { slug, page: pageSlug } = await params;
  const portal = await getPortalBySlug(slug);
  if (!portal) return { title: "Brand portal" };
  const viewer = await getPortalViewer(portal);
  const page = viewer ? (await getGuide(portal.id)).find((p) => p.slug === pageSlug) : undefined;
  return { title: page ? `${page.title} · ${portal.clientName}` : `${portal.clientName} brand portal` };
}

function PreviewBar({ portal, page, note }: { portal: Portal; page: Page; note: string | null }) {
  return (
    <div className="sticky top-0 z-40 flex h-12 items-center justify-between gap-3 bg-zinc-950 px-3 font-sans text-[13px] text-white">
      <p className="flex min-w-0 items-center gap-2">
        <Eye className="size-4 shrink-0" />
        <span className="truncate">
          Admin preview
          {!portal.isPublished && <span className="text-zinc-400"> · Draft, clients can&apos;t sign in yet</span>}
          {note && <span className="text-zinc-400"> · {note}</span>}
        </span>
      </p>
      <Link
        href={`/editor/${portal.id}/${page.id}`}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-white px-2.5 font-medium text-zinc-950 transition hover:bg-zinc-200"
      >
        <PenLine className="size-4" />
        Edit page
      </Link>
    </div>
  );
}

export default async function GuidelinePage({ params }: PageProps<"/p/[slug]/[page]">) {
  const { slug, page: pageSlug } = await params;
  const portal = await getPortalBySlug(slug);
  if (!portal) notFound();
  const viewer = await getPortalViewer(portal);
  if (!viewer) redirect(`/p/${portal.slug}/login`);

  const guide = await getGuide(portal.id);
  const pages = clientPages(guide);
  // Admins can also open pages that are hidden or still empty.
  const page =
    pages.find((p) => p.slug === pageSlug) ?? (viewer.kind === "admin" ? guide.find((p) => p.slug === pageSlug) : undefined);
  if (!page) notFound();

  const position = pages.indexOf(page);
  const next = position === -1 ? pages[0] : pages[(position + 1) % pages.length];
  const blocks = page.blocks.filter(blockHasContent);
  const hasFiles = blocks.some((b) => b.assets.length > 0 || b.colors.length > 0 || b.fonts.length > 0);
  const buttonHref = page.buttonFileId
    ? fileUrl(page.buttonFileId, { download: true })
    : portal.allowZip && hasFiles
      ? `/api/portals/${portal.id}/zip?page=${page.id}`
      : null;
  const note = position !== -1 ? null : page.isHidden ? "This page is hidden from clients" : "Clients won't see this page until it has content";
  const canZip = portal.allowZip && pages.length > 0;

  return (
    <GuideShell
      portal={portal}
      items={pages.map((p, i) => ({ id: p.id, label: `${pageNumber(i)} ${p.title}`, href: `/p/${portal.slug}/${p.slug}` }))}
      activeId={page.id}
      homeHref={`/p/${portal.slug}`}
      top={viewer.kind === "admin" ? <PreviewBar portal={portal} page={page} note={note} /> : undefined}
      sidebarFooter={
        canZip || viewer.kind === "client" ? (
          <div className="flex flex-col items-start gap-2 text-[13px] leading-[17.5px]">
            {canZip && (
              <a href={`/api/portals/${portal.id}/zip`} download className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-55">
                <Download className="size-3.5" />
                Download all files
              </a>
            )}
            {viewer.kind === "client" && (
              <form action={portalLogoutAction}>
                <input type="hidden" name="slug" value={portal.slug} />
                <button type="submit" className="inline-flex cursor-pointer items-center gap-1.5 text-guide-muted transition hover:text-black">
                  <LogOut className="size-3.5" />
                  Sign out
                </button>
              </form>
            )}
          </div>
        ) : undefined
      }
    >
      <PageHero
        page={page}
        number={pageNumber(position === -1 ? guide.indexOf(page) : position)}
        edit={false}
        buttonHref={buttonHref}
      />
      <main>
        {blocks.map((block) => (
          <GuideBlockView key={block.id} block={block} ctx={{ edit: false, portalId: portal.id }} />
        ))}
      </main>
      {next && next.id !== page.id && <NextBand href={`/p/${portal.slug}/${next.slug}`} title={next.title} />}
      <GuideFooter portal={portal} />
    </GuideShell>
  );
}
