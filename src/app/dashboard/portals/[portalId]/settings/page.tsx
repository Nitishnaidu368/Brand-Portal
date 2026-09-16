import { Trash2 } from "lucide-react";
import type { CSSProperties } from "react";
import { UploadDropzone } from "@/components/dashboard/upload-dropzone";
import { ClientIdentityFields } from "@/components/form/client-identity-fields";
import { ColorInput } from "@/components/form/color-input";
import { ActionButton } from "@/components/ui/action-button";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/ui/action-form";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { deletePortalAction, removePortalImageAction, updatePortalSettingsAction } from "@/lib/actions/portals";
import { requireOwnedPortal } from "@/lib/auth/admin";
import type { Portal } from "@/lib/db/schema";
import { fileUrl } from "@/lib/formats";
import { cn } from "@/lib/utils";

const IMAGES = {
  logo: {
    label: "Logo",
    hint: "Shown at the top of the sidebar and on the sign-in screen. SVG or PNG with a transparent background.",
    column: "logoFileId",
  },
  wordmark: {
    label: "Footer wordmark",
    hint: "Shown huge at the foot of every page. Leave empty to use the client name set in Inter.",
    column: "wordmarkFileId",
  },
} as const;

function ImageSetting({ portal, kind }: { portal: Portal; kind: keyof typeof IMAGES }) {
  const { label, hint, column } = IMAGES[kind];
  const fileId = portal[column];

  return (
    <div>
      <p className="text-sm font-medium text-zinc-900">{label}</p>
      <p className="text-xs text-zinc-500">{hint}</p>
      <div className="mt-3 space-y-3">
        {fileId && (
          <div
            className={cn(
              "flex h-40 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 p-6",
              kind === "wordmark" ? "bg-[var(--preview)]" : "checkerboard",
            )}
            style={kind === "wordmark" ? ({ "--preview": portal.accentColor } as CSSProperties) : undefined}
          >
            <img src={fileUrl(fileId, { preview: true })} alt={label} className="max-h-full max-w-full object-contain" />
          </div>
        )}
        <UploadDropzone
          fields={{ purpose: kind, portalId: portal.id }}
          accept=".svg,.png,.jpg,.jpeg,.webp"
          multiple={false}
          title={fileId ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
          compact
        />
        {fileId && (
          <ActionButton
            action={removePortalImageAction}
            fields={{ portalId: portal.id, kind }}
            confirm={`Remove the ${label.toLowerCase()}?`}
            variant="dangerGhost"
            size="sm"
          >
            <Trash2 />
            Remove
          </ActionButton>
        )}
      </div>
    </div>
  );
}

export default async function PortalSettingsPage({ params }: PageProps<"/dashboard/portals/[portalId]/settings">) {
  const { portalId } = await params;
  const { portal } = await requireOwnedPortal(portalId);

  return (
    <div className="space-y-6">
      <ActionForm action={updatePortalSettingsAction} className="space-y-6">
        <input type="hidden" name="portalId" value={portal.id} />
        <Card>
          <CardHeader title="Portal details" />
          <CardBody className="space-y-5">
            <ClientIdentityFields defaultName={portal.clientName} defaultSlug={portal.slug} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tagline" htmlFor="tagline" name="tagline" hint="For your dashboard.">
                <Input id="tagline" name="tagline" defaultValue={portal.tagline} />
              </Field>
              <Field label="Brand color" htmlFor="accentColor" name="accentColor" hint="Page headers, footer and buttons.">
                <ColorInput id="accentColor" name="accentColor" defaultValue={portal.accentColor} />
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Guideline text" description="The small print around every page." />
          <CardBody className="space-y-4">
            <Field label="Sidebar title" htmlFor="guideTitle" name="guideTitle" hint="Shown under the logo. Use two lines.">
              <Textarea id="guideTitle" name="guideTitle" defaultValue={portal.guideTitle} rows={2} placeholder={"Visual Identity\nBrand Guidelines 2026"} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Footer label" htmlFor="footerLabel" name="footerLabel">
                <Input id="footerLabel" name="footerLabel" defaultValue={portal.footerLabel} placeholder="Visual Identity Guidelines" />
              </Field>
              <Field label="Version" htmlFor="versionLabel" name="versionLabel">
                <Input id="versionLabel" name="versionLabel" defaultValue={portal.versionLabel} placeholder="Version 1.0" />
              </Field>
            </div>
          </CardBody>
        </Card>

        <div className="flex items-center gap-3">
          <SubmitButton>Save changes</SubmitButton>
          <FormMessage />
        </div>
      </ActionForm>

      <Card>
        <CardHeader title="Branding" />
        <CardBody className="grid gap-8 md:grid-cols-2">
          <ImageSetting portal={portal} kind="logo" />
          <ImageSetting portal={portal} kind="wordmark" />
        </CardBody>
      </Card>

      <Card className="border-red-200">
        <CardHeader
          title="Delete portal"
          description="Permanently deletes this portal, every uploaded file and its download history."
        />
        <CardBody>
          <ActionForm action={deletePortalAction} className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <input type="hidden" name="portalId" value={portal.id} />
            <div className="flex-1 space-y-1">
              <Input
                name="confirm"
                placeholder={`Type ${portal.slug} to confirm`}
                aria-label="Confirm portal URL"
                autoComplete="off"
              />
              <FieldError name="confirm" />
            </div>
            <SubmitButton variant="danger">Delete portal</SubmitButton>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
