import { and, eq, gt } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PasswordInput } from "@/components/form/password-input";
import { PortalAuthLayout } from "@/components/portal/portal-auth-layout";
import { ActionForm, FormMessage, SubmitButton } from "@/components/ui/action-form";
import { buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { acceptInviteAction } from "@/lib/actions/portal-access";
import { sha256 } from "@/lib/auth/password";
import { getPortalBySlug } from "@/lib/auth/portal";
import { db } from "@/lib/db";
import { portalUsers } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Accept invite", referrer: "no-referrer" };

export default async function InvitePage({ params }: PageProps<"/p/[slug]/invite/[token]">) {
  const { slug, token } = await params;
  const portal = await getPortalBySlug(slug);
  if (!portal) notFound();

  const user =
    portal.isPublished && portal.accessMode === "email"
      ? await db.query.portalUsers.findFirst({
          where: and(
            eq(portalUsers.portalId, portal.id),
            eq(portalUsers.inviteTokenHash, sha256(token)),
            gt(portalUsers.inviteExpiresAt, new Date()),
          ),
        })
      : undefined;

  return (
    <PortalAuthLayout portal={portal}>
      {user ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Welcome{user.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Choose a password to open the {portal.clientName} brand portal as{" "}
            <strong className="font-medium text-zinc-900">{user.email}</strong>.
          </p>
          <ActionForm action={acceptInviteAction} className="mt-8 space-y-4">
            <input type="hidden" name="slug" value={portal.slug} />
            <input type="hidden" name="token" value={token} />
            <Field label="Your name" htmlFor="name" name="name">
              <Input id="name" name="name" defaultValue={user.name} autoComplete="name" />
            </Field>
            <Field label="Password" htmlFor="password" name="password" hint="At least 8 characters.">
              <PasswordInput id="password" name="password" required autoFocus />
            </Field>
            <Field label="Confirm password" htmlFor="confirm" name="confirm">
              <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
            </Field>
            <SubmitButton variant="accent" size="lg" className="w-full">
              Set password and continue
            </SubmitButton>
            <FormMessage />
          </ActionForm>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">This link has expired</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Invite links work once and expire after 7 days. Ask the person who shared this portal for a new one.
          </p>
          <Link href={`/p/${portal.slug}/login`} className={buttonClasses("secondary", "md", "mt-8")}>
            Go to sign in
          </Link>
        </>
      )}
    </PortalAuthLayout>
  );
}
