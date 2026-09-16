import { count, eq } from "drizzle-orm";
import { CheckCircle2, Circle, PenLine } from "lucide-react";
import Link from "next/link";
import { PageList } from "@/components/dashboard/page-list";
import { AddPageForm } from "@/components/editor/add-page-form";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { requireOwnedPortal } from "@/lib/auth/admin";
import { getGuide } from "@/lib/data/portals";
import { db } from "@/lib/db";
import { portalUsers } from "@/lib/db/schema";
import { pageHasContent, type GuidePage } from "@/lib/guide";
import { cn } from "@/lib/utils";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function pageSummary(page: GuidePage) {
  const fileCount = page.blocks.reduce((n, b) => n + b.assets.length + b.fonts.length, 0);
  const colorCount = page.blocks.reduce((n, b) => n + b.colors.length, 0);
  const parts = [plural(page.blocks.length, "block", "blocks")];
  if (fileCount) parts.push(plural(fileCount, "file", "files"));
  if (colorCount) parts.push(plural(colorCount, "color", "colors"));
  if (page.isHidden) parts.push("Hidden from clients");
  else if (!pageHasContent(page)) parts.push("Empty, so clients don't see it yet");
  return parts.join(" · ");
}

export default async function PortalPagesPage({ params }: PageProps<"/dashboard/portals/[portalId]">) {
  const { portalId } = await params;
  const { portal } = await requireOwnedPortal(portalId);
  const [guide, [users]] = await Promise.all([
    getGuide(portal.id),
    db.select({ n: count() }).from(portalUsers).where(eq(portalUsers.portalId, portal.id)),
  ]);

  const base = `/dashboard/portals/${portal.id}`;
  const steps = [
    { label: "Add the client's logo", done: Boolean(portal.logoFileId), href: `${base}/settings` },
    { label: "Fill in the guideline pages", done: guide.some(pageHasContent), href: `/editor/${portal.id}` },
    {
      label: portal.accessMode === "password" ? "Set a portal password" : "Invite your client",
      done: portal.accessMode === "password" ? Boolean(portal.passwordHash) : (users?.n ?? 0) > 0,
      href: `${base}/access`,
    },
    { label: "Publish and share the link", done: portal.isPublished, href: `${base}/access` },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <Card className="self-start overflow-hidden">
        <CardHeader
          title="Pages"
          description="The chapters in your client's left nav. Drag to reorder."
          actions={
            <Link href={`/editor/${portal.id}`} className={buttonClasses("primary", "sm")}>
              <PenLine />
              Open editor
            </Link>
          }
        />
        <PageList
          key={guide.map((p) => `${p.id}:${p.title}:${pageSummary(p)}`).join("|")}
          portalId={portal.id}
          pages={guide.map((p) => ({
            id: p.id,
            title: p.title,
            summary: pageSummary(p),
            muted: p.isHidden || !pageHasContent(p),
            href: `/editor/${portal.id}/${p.id}`,
          }))}
        />
        <div className="border-t border-zinc-100 px-4 py-3">
          <AddPageForm portalId={portal.id} />
        </div>
      </Card>

      <Card className="self-start">
        <CardHeader title="Launch checklist" />
        <ul className="p-2">
          {steps.map((step) => (
            <li key={step.label}>
              <Link href={step.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition hover:bg-zinc-50">
                {step.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="size-5 shrink-0 text-zinc-300" />
                )}
                <span className={cn(step.done ? "text-zinc-400 line-through" : "text-zinc-800")}>{step.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
