import { CalendarDays, Download, Users } from "lucide-react";
import { Stat } from "@/components/dashboard/stat";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { requireOwnedPortal } from "@/lib/auth/admin";
import { getPortalActivity } from "@/lib/data/portals";
import { formatDateTime } from "@/lib/utils";

export default async function PortalActivityPage({ params }: PageProps<"/dashboard/portals/[portalId]/activity">) {
  const { portalId } = await params;
  const { portal } = await requireOwnedPortal(portalId);
  const activity = await getPortalActivity(portal.id);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total downloads" value={activity.total} icon={<Download />} />
        <Stat label="In the last 7 days" value={activity.lastWeek} icon={<CalendarDays />} />
        <Stat
          label={portal.accessMode === "email" ? "People who downloaded" : "Sign-in methods used"}
          value={activity.people}
          icon={<Users />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="self-start overflow-hidden">
          <CardHeader title="Download log" description="Admin previews aren't counted." />
          {activity.recent.length === 0 ? (
            <EmptyState icon={<Download className="size-5" />} title="No downloads yet">
              When clients download files or export colors, it shows up here.
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-zinc-500">
                    <th className="px-5 py-2.5 font-medium">When</th>
                    <th className="px-3 py-2.5 font-medium">Item</th>
                    <th className="px-3 py-2.5 font-medium">Format</th>
                    <th className="px-5 py-2.5 font-medium">Who</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 border-t border-zinc-100">
                  {activity.recent.map((row) => (
                    <tr key={row.id}>
                      <td className="px-5 py-3 whitespace-nowrap text-zinc-500">{formatDateTime(row.createdAt)}</td>
                      <td className="px-3 py-3 font-medium text-zinc-900">{row.label}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-zinc-500">{row.format}</td>
                      <td className="px-5 py-3 text-zinc-500">{row.actor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="self-start">
          <CardHeader title="Most downloaded" />
          {activity.top.length === 0 ? (
            <p className="px-5 py-4 text-sm text-zinc-500">Nothing yet.</p>
          ) : (
            <ol className="divide-y divide-zinc-100">
              {activity.top.map((row, index) => (
                <li key={row.label} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className="w-4 text-zinc-400 tabular-nums">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-zinc-800">{row.label}</span>
                  <span className="text-zinc-500 tabular-nums">{row.n}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
