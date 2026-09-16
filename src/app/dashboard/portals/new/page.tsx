import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AccessModeFields } from "@/components/form/access-mode-fields";
import { ClientIdentityFields } from "@/components/form/client-identity-fields";
import { ColorInput } from "@/components/form/color-input";
import { ActionForm, FormMessage, SubmitButton } from "@/components/ui/action-form";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { createPortalAction } from "@/lib/actions/portals";
import { requireAdmin } from "@/lib/auth/admin";
import { guideTemplate } from "@/lib/templates";

export const metadata: Metadata = { title: "New portal" };

export default async function NewPortalPage() {
  await requireAdmin();
  const chapters = guideTemplate().map((page) => page.title);
  const starts = [
    {
      value: "template",
      title: "Full brand guideline",
      description: `${chapters.length} ready-made chapters: ${chapters.join(", ")}.`,
    },
    { value: "blank", title: "Blank", description: "One empty page. Add pages and blocks as you go." },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" />
        All portals
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900">New client portal</h1>
      <p className="mt-1 text-sm text-zinc-500">You can change everything here later.</p>

      <ActionForm action={createPortalAction} className="mt-6 space-y-6">
        <Card>
          <CardHeader title="Client" description="Who is this portal for?" />
          <CardBody className="space-y-4">
            <ClientIdentityFields />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tagline (optional)" htmlFor="tagline" name="tagline">
                <Input id="tagline" name="tagline" placeholder="Small-batch coffee from the coast" />
              </Field>
              <Field label="Brand color" htmlFor="accentColor" name="accentColor" hint="Page headers, footer and buttons.">
                <ColorInput id="accentColor" name="accentColor" defaultValue="#011520" />
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Start from" description="Empty pages stay hidden from your client until you fill them in." />
          <CardBody className="grid gap-3 sm:grid-cols-2">
            {starts.map((start) => (
              <label
                key={start.value}
                className="flex cursor-pointer gap-3 rounded-xl border border-zinc-200 p-4 transition hover:border-zinc-300 has-checked:border-zinc-900 has-checked:bg-zinc-50/50 has-checked:ring-4 has-checked:ring-zinc-900/5"
              >
                <input
                  type="radio"
                  name="start"
                  value={start.value}
                  defaultChecked={start.value === "template"}
                  className="mt-0.5 accent-zinc-900"
                />
                <span>
                  <span className="block text-sm font-medium text-zinc-900">{start.title}</span>
                  <span className="mt-1 block text-sm text-zinc-500">{start.description}</span>
                </span>
              </label>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Access" description="How will your client sign in?" />
          <CardBody>
            <AccessModeFields defaultMode="password" hasPassword={false} />
          </CardBody>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <FormMessage className="mr-auto" />
          <Link href="/dashboard" className={buttonClasses("ghost", "lg")}>
            Cancel
          </Link>
          <SubmitButton size="lg">Create portal</SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}
