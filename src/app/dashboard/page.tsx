import { Download, FolderLock, Globe, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PortalAvatar } from "@/components/brand";
import { Stat } from "@/components/dashboard/stat";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/admin";
import { getRecentDownloads, listPortals } from "@/lib/data/portals";
import { fileUrl } from "@/lib/formats";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Portals" };

export default async function DashboardPage() {
  const admin = await requireAdmin();
  const [portals, recent] = await Promise.all([listPortals(admin.agencyId), getRecentDownloads(admin.agencyId)]);
  const published = portals.filter((p) => p.isPublished).length;
  const downloads = portals.reduce((sum, p) => sum + p.downloads30d, 0);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Client portals</h1>
          <p className="mt-1 text-sm text-zinc-500">A private brand hub for every client.</p>
        </div>
        <Link href="/dashboard/portals/new" className={buttonClasses()}>
          <Plus />
          New portal
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Portals" value={portals.length} icon={<FolderLock />} />
        <Stat label="Published" value={published} icon={<Globe />} />
        <Stat label="Downloads in the last 30 days" value={downloads} icon={<Download />} />
      </div>

      {portals.length === 0 ? (
        <Card className="mt-6">
          <EmptyState icon={<FolderLock className="size-5" />} title="No portals yet">
            <p>Create a portal, upload your client&apos;s brand assets, and share a private link.</p>
            <Link href="/dashboard/portals/new" className={buttonClasses("primary", "md", "mt-4")}>
              <Plus />
              Create your first portal
            </Link>
          </EmptyState>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portals.map((portal) => (
            <Link
              key={portal.id}
              href={`/dashboard/portals/${portal.id}`}
              className="group overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs transition hover:border-zinc-300 hover:shadow-md"
            >
              <div className="relative h-24" style={{ backgroundColor: portal.accentColor }}>
                {portal.coverFileId && (
                  <img src={fileUrl(portal.coverFileId, { preview: true })} alt="" className="absolute inset-0 size-full object-cover" />
                )}
              </div>
              <div className="px-5 pb-5">
                <PortalAvatar portal={portal} size="lg" className="relative -mt-7 ring-4 ring-white" />
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-zinc-900 group-hover:underline">{portal.clientName}</h2>
                    <p className="truncate text-sm text-zinc-500">/p/{portal.slug}</p>
                  </div>
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
                <p className="mt-4 text-xs text-zinc-500">
                  {portal.pageCount} pages · {portal.assetCount} files · {portal.colorCount} colors · {portal.downloads30d} downloads (30d)
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Card className="mt-8">
        <CardHeader title="Recent downloads" description="What clients have grabbed from their portals." />
        {recent.length === 0 ? (
          <EmptyState icon={<Download className="size-5" />} title="No downloads yet">
            Downloads from client portals will show up here.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500">
                  <th className="px-5 py-2.5 font-medium">Item</th>
                  <th className="px-3 py-2.5 font-medium">Portal</th>
                  <th className="px-3 py-2.5 font-medium">Who</th>
                  <th className="px-5 py-2.5 text-right font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 border-t border-zinc-100">
                {recent.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-3">
                      <span className="font-medium text-zinc-900">{row.label}</span>
                      {row.format && <span className="ml-2 text-zinc-400">{row.format}</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Link href={`/dashboard/portals/${row.portalId}/activity`} className="text-zinc-700 hover:underline">
                        {row.portalName}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-zinc-500">{row.actor}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap text-zinc-500">{timeAgo(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
