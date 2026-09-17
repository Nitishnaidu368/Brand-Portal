import { Plus, Trash2, Type } from "lucide-react";
import { addGoogleFontAction, deleteFontAction, updateFontAction } from "@/lib/actions/content";
import { parseWeights } from "@/lib/fonts";
import { extensionOf } from "@/lib/formats";
import type { GuideBlock } from "@/lib/guide";
import { FontFaces, uploadedFontFamily } from "../../font-faces";
import { ActionButton } from "../../ui/action-button";
import { ActionForm, FormMessage, SubmitButton } from "../../ui/action-form";
import { Card, CardBody, CardHeader, EmptyState } from "../../ui/card";
import { Field, Input, Select } from "../../ui/field";
import { MoveButtons } from "../move-buttons";
import { UploadDropzone } from "../upload-dropzone";

export function FontsEditor({ block }: { block: GuideBlock }) {
  const count = block.fonts.length;
  const families = new Set(block.fonts.filter((font) => font.source === "google").map((font) => font.family.toLowerCase()));
  const presets = [
    { family: "Cinzel", weights: "400, 500, 600, 700", usage: "Display" },
    { family: "Montserrat", weights: "400, 500, 600, 700", usage: "Body" },
  ].filter((font) => !families.has(font.family.toLowerCase()));

  return (
    <>
      <FontFaces fonts={block.fonts} />
      <Card>
        <CardHeader title="Add a Google Font" description="Loaded straight from Google Fonts." />
        <CardBody>
          <ActionForm key={count} action={addGoogleFontAction} className="space-y-3">
            <input type="hidden" name="blockId" value={block.id} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Family" htmlFor={`${block.id}-family`} name="family">
                <Input id={`${block.id}-family`} name="family" placeholder="Inter" required />
              </Field>
              <Field label="Weights" htmlFor={`${block.id}-weights`} name="weights">
                <Input id={`${block.id}-weights`} name="weights" defaultValue="300, 400" />
              </Field>
            </div>
            <div className="flex items-center gap-3">
              <SubmitButton variant="secondary" size="sm">
                <Plus />
                Add font
              </SubmitButton>
              <FormMessage />
            </div>
          </ActionForm>
          {presets.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-500">Quick add:</span>
              {presets.map((font) => (
                <ActionForm key={font.family} action={addGoogleFontAction}>
                  <input type="hidden" name="blockId" value={block.id} />
                  <input type="hidden" name="family" value={font.family} />
                  <input type="hidden" name="weights" value={font.weights} />
                  <input type="hidden" name="style" value="normal" />
                  <input type="hidden" name="usage" value={font.usage} />
                  <SubmitButton variant="secondary" size="sm">{font.family}</SubmitButton>
                </ActionForm>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Upload font files" description="Family and weight are read from each file name." />
        <CardBody>
          <UploadDropzone
            fields={{ purpose: "asset", portalId: block.portalId, blockId: block.id }}
            accept=".woff2,.woff,.ttf,.otf"
            hint="WOFF2, WOFF, TTF or OTF, e.g. Brand-SemiBold.woff2"
            compact
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Fonts" description={count ? `${count} ${count === 1 ? "font" : "fonts"}` : undefined} />
        {count === 0 ? (
          <EmptyState icon={<Type className="size-5" />} title="No fonts yet">
            Add a Google Font or upload font files above.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {block.fonts.map((font, index) => {
              const uploaded = font.source === "upload";
              const weight = parseWeights(font.weights)[0] ?? 400;
              return (
                <li key={`${font.id}:${font.family}:${font.weights}:${font.style}:${font.usage}`} className="flex gap-3 px-4 py-4">
                  <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50">
                    <span
                      className="text-2xl text-zinc-900"
                      style={{
                        fontFamily: uploaded ? uploadedFontFamily(font.id) : `"${font.family}", sans-serif`,
                        fontWeight: weight,
                        fontStyle: font.style,
                      }}
                    >
                      Aa
                    </span>
                    <span className="mt-0.5 text-[9px] font-medium tracking-wide text-zinc-500 uppercase">
                      {uploaded && font.file ? extensionOf(font.file.originalName) : "Google"}
                    </span>
                  </div>
                  <ActionForm action={updateFontAction} className="min-w-0 flex-1 space-y-3">
                    <input type="hidden" name="fontId" value={font.id} />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Family" htmlFor={`${font.id}-family`} name="family" className="col-span-2">
                        <Input id={`${font.id}-family`} name="family" defaultValue={font.family} required />
                      </Field>
                      <Field label={uploaded ? "Weight" : "Weights"} htmlFor={`${font.id}-weights`} name="weights">
                        <Input id={`${font.id}-weights`} name="weights" defaultValue={font.weights} />
                      </Field>
                      {uploaded ? (
                        <Field label="Style" htmlFor={`${font.id}-style`}>
                          <Select id={`${font.id}-style`} name="style" defaultValue={font.style}>
                            <option value="normal">Normal</option>
                            <option value="italic">Italic</option>
                          </Select>
                        </Field>
                      ) : (
                        <input type="hidden" name="style" value="normal" />
                      )}
                      <input type="hidden" name="usage" value={font.usage} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <SubmitButton variant="secondary" size="sm">
                        Save
                      </SubmitButton>
                      <FormMessage />
                      <div className="ml-auto flex items-center gap-0.5">
                        <MoveButtons kind="font" id={font.id} first={index === 0} last={index === count - 1} />
                        <ActionButton
                          action={deleteFontAction}
                          fields={{ fontId: font.id }}
                          confirm={`Remove ${font.family}?`}
                          variant="dangerGhost"
                          size="icon"
                          aria-label={`Remove ${font.family}`}
                          title="Remove"
                        >
                          <Trash2 />
                        </ActionButton>
                      </div>
                    </div>
                  </ActionForm>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
