import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GuideShell } from "@/components/guide/guide-shell";
import { getPortalBySlug, getPortalViewer } from "@/lib/auth/portal";
import { getGuide } from "@/lib/data/portals";
import { clientPages } from "@/lib/guide";

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const portal = await getPortalBySlug(slug);
  return { title: portal ? `${portal.clientName} brand portal` : "Brand portal" };
}

/** The portal's address opens its first page. */
export default async function PortalHome({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const portal = await getPortalBySlug(slug);
  if (!portal) notFound();
  const viewer = await getPortalViewer(portal);
  if (!viewer) redirect(`/p/${portal.slug}/login`);

  const [first] = clientPages(await getGuide(portal.id));
  if (first) redirect(`/p/${portal.slug}/${first.slug}`);

  return (
    <GuideShell portal={portal} items={[]} activeId={null} homeHref={`/p/${portal.slug}`}>
      <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
        <p className="text-[26px] leading-[1.2] tracking-[-0.01em] sm:text-[34px]">Brand guidelines are on their way.</p>
        <p className="mt-3 text-[14px] text-guide-muted">
          {viewer.kind === "admin" ? "Pages show up here once they have content." : "Check back soon."}
        </p>
        {viewer.kind === "admin" && (
          <Link href={`/editor/${portal.id}`} className="mt-6 text-[14px] underline underline-offset-4">
            Open the editor
          </Link>
        )}
      </div>
    </GuideShell>
  );
}
