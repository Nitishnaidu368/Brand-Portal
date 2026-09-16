import { ArrowLeft, ExternalLink, Globe, GlobeLock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PortalAvatar } from "@/components/brand";
import { PortalTabs } from "@/components/dashboard/portal-tabs";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { setPublishedAction } from "@/lib/actions/portals";
import { requireOwnedPortal } from "@/lib/auth/admin";

export async function generateMetadata({ params }: LayoutProps<"/dashboard/portals/[portalId]">): Promise<Metadata> {
  const { portalId } = await params;
  const { portal } = await requireOwnedPortal(portalId);
  return { title: portal.clientName };
}

export default async function PortalLayout({ children, params }: LayoutProps<"/dashboard/portals/[portalId]">) {
  const { portalId } = await params;
  const { portal } = await requireOwnedPortal(portalId);

  return (
    <div>
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" />
        All portals
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <PortalAvatar portal={portal} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-900">{portal.clientName}</h1>
              {portal.isPublished ? (
                <Badge tone="green" dot>
                  Live
                </Badge>
              ) : (
                <Badge tone="amber" dot>
                  Draft
                </Badge>
              )}
            </div>
            <p className="truncate text-sm text-zinc-500">/p/{portal.slug}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/p/${portal.slug}`} target="_blank" className={buttonClasses("secondary")}>
            <ExternalLink />
            Preview
          </Link>
          <ActionButton
            action={setPublishedAction}
            fields={{ portalId: portal.id, published: portal.isPublished ? "0" : "1" }}
            variant={portal.isPublished ? "secondary" : "primary"}
            confirm={portal.isPublished ? "Unpublish this portal? Clients won't be able to sign in." : undefined}
          >
            {portal.isPublished ? <GlobeLock /> : <Globe />}
            {portal.isPublished ? "Unpublish" : "Publish"}
          </ActionButton>
        </div>
      </div>

      <PortalTabs portalId={portal.id} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
