import { Trash2 } from "lucide-react";
import { deletePageAction, removePageFileAction, updatePageAction } from "@/lib/actions/guide";
import type { Page, Portal } from "@/lib/db/schema";
import type { PublicFile } from "@/lib/files";
import { formatBytes } from "@/lib/formats";
import { UploadDropzone } from "../dashboard/upload-dropzone";
import { ActionButton } from "../ui/action-button";
import { ActionForm, FormMessage, SubmitButton } from "../ui/action-form";
import { Card, CardBody, CardHeader } from "../ui/card";
import { Field, Input, Textarea } from "../ui/field";

export function PageSettings({ portal, page, buttonFile }: { portal: Portal; page: Page; buttonFile: PublicFile | null }) {
  return (
    <>
      <Card>
        <CardHeader title="Page" />
        <CardBody>
          <ActionForm key={`${page.id}:${page.title}:${page.slug}:${page.buttonLabel}:${page.isHidden}`} action={updatePageAction} className="space-y-4">
            <input type="hidden" name="pageId" value={page.id} />
            <Field label="Title" htmlFor="page-title" name="title">
              <Input id="page-title" name="title" defaultValue={page.title} maxLength={60} required />
            </Field>
            <Field label="Page URL" htmlFor="page-slug" name="slug">
              <div className="flex h-9 items-center rounded-lg border border-zinc-200 bg-white shadow-xs focus-within:border-zinc-400 focus-within:ring-4 focus-within:ring-zinc-900/5">
                <span className="truncate pl-3 text-sm text-zinc-400 select-none">/p/{portal.slug}/</span>
                <input
                  id="page-slug"
                  name="slug"
                  defaultValue={page.slug}
                  required
                  spellCheck={false}
                  autoComplete="off"
                  className="h-full w-full min-w-0 bg-transparent pr-3 text-sm text-zinc-900 outline-none"
                />
              </div>
            </Field>
            <Field label="Intro" htmlFor="page-intro" name="intro" hint="The large paragraph under the page title.">
              <Textarea id="page-intro" name="intro" defaultValue={page.intro} rows={4} />
            </Field>
            <Field label="Download button" htmlFor="page-button" name="buttonLabel" hint="Leave empty to hide the button.">
              <Input id="page-button" name="buttonLabel" defaultValue={page.buttonLabel} placeholder="Download Logos" maxLength={40} />
            </Field>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input type="checkbox" name="isHidden" defaultChecked={page.isHidden} className="mt-0.5 accent-zinc-900" />
              <span className="text-sm">
                <span className="block font-medium text-zinc-900">Hide from clients</span>
                <span className="block text-[13px] text-zinc-500">Pages without content are hidden automatically.</span>
              </span>
            </label>
            <div className="flex items-center gap-3">
              <SubmitButton size="sm">Save page</SubmitButton>
              <FormMessage />
            </div>
          </ActionForm>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="What the button downloads"
          description="Upload a file or a prepared brand-kit ZIP (up to 50 MB). Without a file, the download button stays hidden."
        />
        <CardBody className="space-y-3">
          {buttonFile && (
            <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{buttonFile.originalName}</span>
              <span className="text-xs text-zinc-500">{formatBytes(buttonFile.sizeBytes)}</span>
              <ActionButton
                action={removePageFileAction}
                fields={{ pageId: page.id }}
                variant="dangerGhost"
                size="icon"
                aria-label="Remove file"
                title="Remove file"
              >
                <Trash2 />
              </ActionButton>
            </div>
          )}
          <UploadDropzone
            fields={{ purpose: "pageButton", portalId: portal.id, pageId: page.id }}
            multiple={false}
            compact
            title={buttonFile ? "Replace file" : "Drop a file"}
            hint="ZIP, PDF, fonts, images or video."
          />
        </CardBody>
      </Card>

      <Card className="border-red-200">
        <CardHeader title="Delete page" description="Removes the page, its blocks and every file uploaded to it." />
        <CardBody>
          <ActionButton
            action={deletePageAction}
            fields={{ pageId: page.id }}
            confirm={`Delete “${page.title}” and everything on it? This can't be undone.`}
            variant="danger"
            size="sm"
          >
            <Trash2 />
            Delete page
          </ActionButton>
        </CardBody>
      </Card>
    </>
  );
}
