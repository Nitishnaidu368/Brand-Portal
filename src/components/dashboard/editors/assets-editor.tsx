import { Download, ImageIcon, Trash2 } from "lucide-react";
import { deleteAssetAction, updateAssetAction } from "@/lib/actions/content";
import { MAX_UPLOAD_BYTES } from "@/lib/config";
import type { BlockType } from "@/lib/db/schema";
import { extensionOf, fileUrl, formatBytes, isImageMime } from "@/lib/formats";
import type { GuideAsset, GuideBlock } from "@/lib/guide";
import { cn } from "@/lib/utils";
import { ActionButton } from "../../ui/action-button";
import { ActionForm, FormMessage, SubmitButton } from "../../ui/action-form";
import { buttonClasses } from "../../ui/button";
import { Card, CardBody, CardHeader, EmptyState } from "../../ui/card";
import { Field, Input, Select } from "../../ui/field";
import { MoveButtons } from "../move-buttons";
import { UploadDropzone } from "../upload-dropzone";

const ACCEPT: Partial<Record<BlockType, string>> = {
  media: ".svg,.png,.jpg,.jpeg,.webp,.gif,.mp4",
  icons: ".svg,.png",
  banners: ".png,.jpg,.jpeg,.webp,.gif,.svg,.mp4",
};

const HINTS: Partial<Record<BlockType, string>> = {
  media: "SVG, PNG, JPG, WEBP, GIF or MP4. SVG logos get PNG and JPG downloads automatically.",
  icons: "SVG works best, so clients can copy the code. PNG is accepted too.",
  banners: "PNG, JPG, WEBP, GIF, SVG or MP4. Common social sizes are labelled automatically.",
  files: "PDF, ZIP, EPS, AI, images, fonts or MP4.",
};

const TOP_LABEL: Partial<Record<BlockType, [label: string, placeholder: string]>> = {
  media: ["Caption above", "Project Management"],
  icons: ["Category", "Navigation"],
  banners: ["Platform", "LinkedIn"],
  files: ["Group", "Templates"],
};

const MEDIA_VARIANTS: [value: string, label: string][] = [
  ["default", "Block background"],
  ["light", "Black tile (for light artwork)"],
  ["dark", "Light tile (for dark artwork)"],
  ["do", "Do: green outline"],
  ["dont", "Don't: red outline"],
];

function AssetThumb({ asset }: { asset: GuideAsset }) {
  return (
    <div
      className={cn(
        "flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 p-1.5",
        asset.variant === "light" ? "bg-zinc-900" : "checkerboard",
      )}
    >
      {isImageMime(asset.file.mimeType) ? (
        <img src={fileUrl(asset.file.id, { preview: true })} alt="" className="max-h-full max-w-full object-contain" />
      ) : (
        <span className="text-[10px] font-semibold text-zinc-500 uppercase">{extensionOf(asset.file.originalName)}</span>
      )}
    </div>
  );
}

export function AssetsEditor({ block }: { block: GuideBlock }) {
  const count = block.assets.length;
  const top = TOP_LABEL[block.type];

  return (
    <>
      <Card>
        <CardHeader title="Upload" description={`Up to ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB per file.`} />
        <CardBody>
          <UploadDropzone
            fields={{ purpose: "asset", portalId: block.portalId, blockId: block.id }}
            accept={ACCEPT[block.type]}
            hint={HINTS[block.type]}
            compact
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Files" description={count ? `${count} ${count === 1 ? "file" : "files"}, shown in this order` : undefined} />
        {count === 0 ? (
          <EmptyState icon={<ImageIcon className="size-5" />} title="Nothing uploaded yet">
            Uploaded files appear here, ready to caption and arrange.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {block.assets.map((asset, index) => {
              const { file } = asset;
              const meta = [
                extensionOf(file.originalName).toUpperCase(),
                file.width && file.height ? `${file.width} × ${file.height}` : null,
                formatBytes(file.sizeBytes),
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <li
                  key={`${asset.id}:${asset.name}:${asset.groupLabel}:${asset.description}:${asset.variant}`}
                  className="flex gap-3 px-4 py-4"
                >
                  <AssetThumb asset={asset} />
                  <ActionForm action={updateAssetAction} className="min-w-0 flex-1 space-y-3">
                    <input type="hidden" name="assetId" value={asset.id} />
                    <Field label="Name" htmlFor={`${asset.id}-name`} name="name" hint={meta}>
                      <Input id={`${asset.id}-name`} name="name" defaultValue={asset.name} required />
                    </Field>
                    {top ? (
                      <Field label={top[0]} htmlFor={`${asset.id}-group`} name="groupLabel">
                        <Input id={`${asset.id}-group`} name="groupLabel" defaultValue={asset.groupLabel} placeholder={top[1]} />
                      </Field>
                    ) : (
                      <input type="hidden" name="groupLabel" value={asset.groupLabel} />
                    )}
                    <Field
                      label={block.type === "media" ? "Caption below" : "Description"}
                      htmlFor={`${asset.id}-description`}
                      name="description"
                    >
                      <Input id={`${asset.id}-description`} name="description" defaultValue={asset.description} />
                    </Field>
                    {block.type === "media" ? (
                      <Field label="Tile" htmlFor={`${asset.id}-variant`}>
                        <Select id={`${asset.id}-variant`} name="variant" defaultValue={asset.variant}>
                          {MEDIA_VARIANTS.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    ) : (
                      <input type="hidden" name="variant" value={asset.variant} />
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <SubmitButton variant="secondary" size="sm">
                        Save
                      </SubmitButton>
                      <FormMessage />
                      <div className="ml-auto flex items-center gap-0.5">
                        <MoveButtons kind="asset" id={asset.id} first={index === 0} last={index === count - 1} />
                        <a
                          href={fileUrl(file.id, { download: true })}
                          download
                          className={buttonClasses("ghost", "icon")}
                          aria-label="Download original"
                          title="Download original"
                        >
                          <Download />
                        </a>
                        <ActionButton
                          action={deleteAssetAction}
                          fields={{ assetId: asset.id }}
                          confirm={`Delete ${asset.name}? This removes the file for everyone.`}
                          variant="dangerGhost"
                          size="icon"
                          aria-label={`Delete ${asset.name}`}
                          title="Delete"
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
