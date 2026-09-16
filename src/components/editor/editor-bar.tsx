import { ArrowLeft, ExternalLink, Globe, GlobeLock, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { setPublishedAction } from "@/lib/actions/portals";
import type { Page, Portal } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { ActionButton } from "../ui/action-button";

const barLink =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white [&_svg]:size-4";

export function EditorBar({ portal, page }: { portal: Portal; page: Page }) {
  return (
    <div className="sticky top-0 z-40 flex h-12 items-center justify-between gap-2 bg-zinc-950 px-2 font-sans text-white sm:px-3">
      <div className="flex min-w-0 items-center gap-1">
        <Link href={`/dashboard/portals/${portal.id}`} className={barLink}>
          <ArrowLeft />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>
        <span className="mx-1 hidden h-4 w-px bg-white/15 sm:block" />
        <span className="truncate text-[13px] font-medium">{portal.clientName}</span>
        <span
          className={cn(
            "ml-1.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
            portal.isPublished ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300",
          )}
        >
          {portal.isPublished ? "Live" : "Draft"}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className="mr-2 hidden text-[12px] text-zinc-500 xl:inline">Click any text on the page to edit it</span>
        <Link href={`/editor/${portal.id}/${page.id}?panel=page`} scroll={false} className={barLink}>
          <SlidersHorizontal />
          <span className="hidden md:inline">Page settings</span>
        </Link>
        <Link href={`/p/${portal.slug}/${page.slug}`} target="_blank" className={barLink}>
          <ExternalLink />
          <span className="hidden md:inline">Preview</span>
        </Link>
        <ActionButton
          action={setPublishedAction}
          fields={{ portalId: portal.id, published: portal.isPublished ? "0" : "1" }}
          confirm={portal.isPublished ? "Unpublish this portal? Clients won't be able to sign in." : undefined}
          size="sm"
          className={
            portal.isPublished ? "bg-white/10 text-white shadow-none hover:bg-white/20" : "bg-white text-zinc-950 hover:bg-zinc-200"
          }
        >
          {portal.isPublished ? <GlobeLock /> : <Globe />}
          {portal.isPublished ? "Unpublish" : "Publish"}
        </ActionButton>
      </div>
    </div>
  );
}
