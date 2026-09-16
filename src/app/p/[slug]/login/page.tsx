import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PortalAuthLayout } from "@/components/portal/portal-auth-layout";
import { ActionForm, FormMessage, SubmitButton } from "@/components/ui/action-form";
import { portalEmailLoginAction, portalPasswordLoginAction } from "@/lib/actions/portal-access";
import { getPortalBySlug, getPortalViewer } from "@/lib/auth/portal";

export async function generateMetadata({ params }: PageProps<"/p/[slug]/login">): Promise<Metadata> {
  const { slug } = await params;
  const portal = await getPortalBySlug(slug);
  return { title: portal ? `${portal.clientName} brand portal` : "Brand portal" };
}

const field =
  "block h-[38px] w-full rounded-[3px] bg-[#E6E6E6] px-3 text-[13px] text-black outline-none transition placeholder:text-[#8C8C8C] focus:bg-[#E0E0E0] focus:ring-2 focus:ring-[var(--accent)]/25";
const submit = "h-[38px] w-full rounded-[3px] text-[12px] font-medium shadow-none";

export default async function PortalLoginPage({ params }: PageProps<"/p/[slug]/login">) {
  const { slug } = await params;
  const portal = await getPortalBySlug(slug);
  if (!portal) notFound();
  if (await getPortalViewer(portal)) redirect(`/p/${portal.slug}`);

  return (
    <PortalAuthLayout portal={portal}>
      {!portal.isPublished ? (
        <p className="text-center text-[13px] text-guide-muted">This portal isn&apos;t available yet. Check back soon.</p>
      ) : portal.accessMode === "password" ? (
        <ActionForm action={portalPasswordLoginAction} className="space-y-4">
          <input type="hidden" name="slug" value={portal.slug} />
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="password"
            aria-label="Password"
            required
            autoFocus
            className={field}
          />
          <SubmitButton variant="accent" className={submit}>
            Submit
          </SubmitButton>
          <FormMessage className="justify-center text-center text-[13px]" />
        </ActionForm>
      ) : (
        <ActionForm action={portalEmailLoginAction} className="space-y-3">
          <input type="hidden" name="slug" value={portal.slug} />
          <input name="email" type="email" autoComplete="email" placeholder="email" aria-label="Email" required autoFocus className={field} />
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="password"
            aria-label="Password"
            required
            className={field}
          />
          <SubmitButton variant="accent" className={`${submit} mt-1`}>
            Sign in
          </SubmitButton>
          <FormMessage className="justify-center text-center text-[13px]" />
          <p className="text-center text-[12px] text-guide-faint">Forgot your password? Ask your contact for a new link.</p>
        </ActionForm>
      )}
    </PortalAuthLayout>
  );
}
