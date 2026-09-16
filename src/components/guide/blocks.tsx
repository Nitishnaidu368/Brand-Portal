import { Check, ChevronDown, Download, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { contrastRating } from "@/lib/blocks";
import { contrastRatio } from "@/lib/color";
import { COLOR_EXPORT_FORMATS } from "@/lib/exports";
import { googleFontsHref, parseWeights, weightName } from "@/lib/fonts";
import { extensionOf, fileUrl, formatBytes, isImageMime } from "@/lib/formats";
import type { GuideAsset, GuideBlock } from "@/lib/guide";
import { cn } from "@/lib/utils";
import { DownloadMenu } from "../download-menu";
import { Dropdown, DropdownLink } from "../dropdown";
import { FontFaces, uploadedFontFamily } from "../font-faces";
import { IconGrid } from "../portal/icon-grid";
import { TypeTester, type TypeFamily } from "../portal/type-tester";
import { ColorSwatches } from "./color-swatches";
import { Txt, type EditTarget } from "./txt";

type Ctx = { edit: boolean; portalId: string };
type Of<T extends GuideBlock["type"]> = Extract<GuideBlock, { type: T }>;

/** Horizontal page padding: 35px at desktop, measured from the reference. */
const PAD = "px-5 sm:px-[35px]";

const COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
};

const ASPECT: Record<string, string> = {
  "16/9": "aspect-video",
  "3/2": "aspect-[3/2]",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
  "3/4": "aspect-[3/4]",
};

const TILE: Record<string, string> = {
  none: "",
  grey: "bg-guide-tile",
  white: "bg-white ring-1 ring-black/5 ring-inset",
  dark: "bg-[#121212]",
};

function hasHeaderText(block: GuideBlock) {
  const { label, sublabel, body } = block.data;
  return Boolean(label.trim() || sublabel.trim() || body.trim());
}

function BlockHeader({ block, ctx }: { block: GuideBlock; ctx: Ctx }) {
  if (!ctx.edit && !hasHeaderText(block)) return null;
  const target: EditTarget = ctx.edit ? { kind: "block", id: block.id } : null;
  const { label, sublabel, body, size } = block.data;

  return (
    <div
      className={cn(
        PAD,
        "grid gap-x-5 gap-y-3 md:grid-cols-2",
        size === "lg" ? "text-[18px] leading-[22px] lg:text-[20px] lg:leading-[24px]" : "text-[14px] leading-[19.5px]",
        block.type !== "text" && "pb-9",
      )}
    >
      <div className="min-w-0">
        <Txt edit={target} field="label" value={label} placeholder="Label" />
        <Txt edit={target} field="sublabel" value={sublabel} placeholder="Sub-label" className="text-guide-muted" />
      </div>
      <Txt edit={target} field="body" value={body} placeholder="Description (optional)" markdown multiline className="min-w-0" />
    </div>
  );
}

function EmptyBlock({ block, ctx, children }: { block: GuideBlock; ctx: Ctx; children: ReactNode }) {
  if (!ctx.edit) return null;
  return (
    <div className={PAD}>
      <Link
        href={`?block=${block.id}`}
        scroll={false}
        className="flex min-h-32 items-center justify-center rounded-[8px] border border-dashed border-black/15 px-6 py-10 text-center text-[13px] text-guide-muted transition hover:border-black/30 hover:bg-guide-tile"
      >
        {children}
      </Link>
    </div>
  );
}

/* Text grid */

function CardsBody({ block, ctx }: { block: Of<"cards">; ctx: Ctx }) {
  const target: EditTarget = ctx.edit ? { kind: "block", id: block.id } : null;
  const { columns, items } = block.data;
  if (items.length === 0) return <EmptyBlock block={block} ctx={ctx}>Add cards in the block settings</EmptyBlock>;

  return (
    <div className={cn(PAD, "grid gap-x-4 gap-y-12 text-[14px] leading-[19.5px] lg:gap-y-16", COLS[columns])}>
      {items.map((item, index) =>
        !ctx.edit && !item.title.trim() && !item.body.trim() ? null : (
          <div key={index} className={cn("min-w-0", index >= columns && "lg:border-t lg:border-guide-rule lg:pt-6")}>
            <Txt edit={target} field={`items.${index}.title`} value={item.title} placeholder="Title" className="text-guide-muted" />
            <Txt
              edit={target}
              field={`items.${index}.body`}
              value={item.body}
              placeholder="Short description"
              markdown
              multiline
              className="mt-6"
            />
          </div>
        ),
      )}
    </div>
  );
}

/* Images & video */

function MediaTile({ asset, block }: { asset: GuideAsset; block: Of<"media"> }) {
  const { file } = asset;
  const { background, aspect, fit, downloadable } = block.data;
  // "Light" logos are made for dark backgrounds, "dark" logos for light ones.
  const tone = asset.variant === "light" ? "dark" : asset.variant === "dark" && background === "dark" ? "grey" : background;
  const natural = aspect === "auto";
  const cover = fit === "cover";
  const sizing = cn("block", natural ? "h-auto w-full" : "size-full", cover ? "object-cover" : "object-contain");
  const verdict = asset.variant === "do" ? "do" : asset.variant === "dont" ? "dont" : null;

  return (
    <figure className="group/tile min-w-0">
      {asset.groupLabel && (
        <p className="mb-6 text-center text-[12px] leading-[17px] text-guide-faint lg:mb-[34px]">{asset.groupLabel}</p>
      )}
      <div
        className={cn(
          "relative overflow-hidden",
          TILE[tone],
          tone !== "none" && "rounded-[8px]",
          !natural && ASPECT[aspect],
          !natural && !cover && tone !== "none" && "p-[9%]",
          verdict === "do" && "ring-2 ring-emerald-500/60 ring-inset",
          verdict === "dont" && "ring-2 ring-red-500/60 ring-inset",
        )}
      >
        {file.mimeType.startsWith("video/") ? (
          <video src={fileUrl(file.id)} autoPlay muted loop playsInline aria-label={asset.name} className={sizing} />
        ) : isImageMime(file.mimeType) ? (
          <img src={fileUrl(file.id, { preview: true })} alt={asset.name} loading="lazy" className={sizing} />
        ) : (
          <span className="flex size-full items-center justify-center text-sm text-guide-muted uppercase">
            {extensionOf(file.originalName)}
          </span>
        )}
        {downloadable && (
          <div className="absolute right-3 bottom-3 transition sm:opacity-0 sm:group-focus-within/tile:opacity-100 sm:group-hover/tile:opacity-100">
            <DownloadMenu file={file} />
          </div>
        )}
      </div>
      {(asset.description || verdict) && (
        <figcaption className="mt-4 flex items-start justify-center gap-1.5 text-center text-[12px] leading-[17px] text-guide-faint lg:mt-6">
          {verdict === "do" && <Check className="mt-px size-3.5 shrink-0 text-emerald-600" aria-label="Do" />}
          {verdict === "dont" && <X className="mt-px size-3.5 shrink-0 text-red-600" aria-label="Don't" />}
          <span>{asset.description}</span>
        </figcaption>
      )}
    </figure>
  );
}

function MediaBody({ block, ctx }: { block: Of<"media">; ctx: Ctx }) {
  if (block.assets.length === 0) {
    return <EmptyBlock block={block} ctx={ctx}>Upload images or MP4 video in the block settings</EmptyBlock>;
  }
  return (
    <div className={cn(PAD, "grid gap-5", COLS[block.data.columns])}>
      {block.assets.map((asset) => (
        <MediaTile key={asset.id} asset={asset} block={block} />
      ))}
    </div>
  );
}

/* Colors */

function ColorsBody({ block, ctx }: { block: Of<"colors">; ctx: Ctx }) {
  if (block.colors.length === 0) return <EmptyBlock block={block} ctx={ctx}>Add colors in the block settings</EmptyBlock>;
  return (
    <div className={PAD}>
      <ColorSwatches colors={block.colors} columns={block.data.columns} height={block.data.height} />
      {block.data.exportable && (
        <div className="mt-3 flex justify-end">
          <Dropdown
            buttonClassName="inline-flex cursor-pointer items-center gap-1 text-[12px] text-guide-muted transition hover:text-black"
            label={
              <>
                <Download className="size-3.5" />
                Download palette
                <ChevronDown className="size-3.5" />
              </>
            }
          >
            {Object.entries(COLOR_EXPORT_FORMATS).map(([format, meta]) => (
              <DropdownLink key={format} href={`/api/portals/${ctx.portalId}/colors?format=${format}&block=${block.id}`}>
                {meta.label}
              </DropdownLink>
            ))}
          </Dropdown>
        </div>
      )}
    </div>
  );
}

function PairingsBody({ block, ctx }: { block: Of<"pairings">; ctx: Ctx }) {
  if (block.data.items.length === 0) return <EmptyBlock block={block} ctx={ctx}>Add color pairings in the block settings</EmptyBlock>;
  return (
    <div className={cn(PAD, "grid gap-x-5 gap-y-10 lg:gap-y-[50px]", COLS[block.data.columns])}>
      {block.data.items.map((pair, index) => {
        const ratio = contrastRatio(pair.background, pair.foreground);
        return (
          <figure key={index}>
            <div
              className="flex aspect-square items-center justify-center ring-1 ring-black/5 ring-inset"
              style={{ backgroundColor: pair.background }}
            >
              <div className="h-[40%] w-[47%]" style={{ backgroundColor: pair.foreground }} />
            </div>
            <figcaption
              className="mt-6 text-center text-[12px] leading-[17px] text-guide-faint lg:mt-9"
              title={`Contrast ${ratio.toFixed(2)}:1 · ${pair.foreground} on ${pair.background}`}
            >
              {contrastRating(ratio)}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

/* Typography */

function typeFamilies(block: Of<"typeface">) {
  const families = new Map<string, TypeFamily>();
  for (const font of block.fonts) {
    const key = `${font.source}:${font.family.toLowerCase()}`;
    const family = families.get(key) ?? { key, family: font.family, source: font.source, usage: font.usage, faces: [] };
    if (!family.usage && font.usage) family.usage = font.usage;
    if (font.source === "upload") {
      if (font.file) {
        family.faces.push({
          id: font.id,
          weight: parseWeights(font.weights)[0] ?? 400,
          style: font.style,
          cssFamily: uploadedFontFamily(font.id),
          file: font.file,
        });
      }
    } else {
      for (const weight of parseWeights(font.weights)) {
        family.faces.push({ id: `${font.id}-${weight}`, weight, style: "normal", cssFamily: `"${font.family}", sans-serif`, file: null });
      }
    }
    families.set(key, family);
  }
  const list = [...families.values()].filter((f) => f.faces.length > 0);
  for (const family of list) family.faces.sort((a, b) => a.weight - b.weight || a.style.localeCompare(b.style));
  return list;
}

function TypefaceBody({ block, ctx }: { block: Of<"typeface">; ctx: Ctx }) {
  const families = typeFamilies(block);
  if (families.length === 0) return <EmptyBlock block={block} ctx={ctx}>Add a Google Font or upload font files in the block settings</EmptyBlock>;

  return (
    <div className={PAD}>
      <FontFaces fonts={block.fonts} />
      <div className="space-y-12 text-[clamp(26px,4.2vw,53px)] leading-[1.02] tracking-[-0.01em] lg:space-y-[62px]">
        {families.flatMap((family) =>
          family.faces.map((face) => (
            <div key={face.id} className="min-w-0" style={{ fontFamily: face.cssFamily, fontWeight: face.weight, fontStyle: face.style }}>
              <p>
                {family.family} {weightName(face.weight)}
                {face.style === "italic" ? " Italic" : ""}
              </p>
              {block.data.characters && (
                <>
                  <p className="break-all">ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
                  <p className="break-all">abcdefghijklmnopqrstuvwxyz</p>
                  <p>0123456789</p>
                  <p>!@#$%^&amp;*()?+</p>
                </>
              )}
            </div>
          )),
        )}
      </div>
      <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[13px] leading-[18px]">
        {families.map((family) =>
          family.source === "google" ? (
            <a
              key={family.key}
              href={`https://fonts.google.com/specimen/${encodeURIComponent(family.family).replace(/%20/g, "+")}`}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:opacity-60"
            >
              Get {family.family} on Google Fonts
            </a>
          ) : (
            family.faces
              .filter((face) => face.file)
              .map((face) => (
                <a
                  key={face.id}
                  href={fileUrl(face.file!.id, { download: true })}
                  download
                  className="underline underline-offset-4 hover:opacity-60"
                >
                  Download {family.family} {weightName(face.weight)}
                </a>
              ))
          ),
        )}
      </div>
      {block.data.tester && (
        <div className="mt-12">
          <TypeTester families={families} />
        </div>
      )}
    </div>
  );
}

function TypescaleBody({ block, ctx }: { block: Of<"typescale">; ctx: Ctx }) {
  const target: EditTarget = ctx.edit ? { kind: "block", id: block.id } : null;
  const { items, font, background } = block.data;
  if (items.length === 0) return <EmptyBlock block={block} ctx={ctx}>Add type styles in the block settings</EmptyBlock>;
  const dark = background === "dark";
  const weights = [...new Set(items.map((item) => item.weight))];

  return (
    <div className={PAD}>
      {font && <link rel="stylesheet" href={googleFontsHref(font, weights)} precedence="default" />}
      <div
        className={cn("px-5 py-4 sm:py-6", dark ? "bg-black text-white" : "bg-guide-tile text-black")}
        style={font ? { fontFamily: `"${font}", var(--font-sans)` } : undefined}
      >
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              "flex flex-wrap items-end justify-between gap-x-8 gap-y-2 py-3.5",
              index < items.length - 1 && (dark ? "border-b border-white/35" : "border-b border-black/15"),
            )}
          >
            <Txt
              edit={target}
              field={`items.${index}.text`}
              value={item.text}
              placeholder="Sample text"
              multiline
              className="max-w-full min-w-0 leading-[1.05] tracking-[-0.02em]"
              style={{ fontSize: `min(${item.size}px, ${(item.size / 10.7).toFixed(2)}vw)`, fontWeight: item.weight }}
            />
            <Txt
              edit={target}
              field={`items.${index}.label`}
              value={item.label}
              placeholder="Style name"
              className="shrink-0 font-sans text-[14px] leading-[18px]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* Icons, banners, downloads */

function IconsBody({ block, ctx }: { block: Of<"icons">; ctx: Ctx }) {
  if (block.assets.length === 0) return <EmptyBlock block={block} ctx={ctx}>Upload SVG or PNG icons in the block settings</EmptyBlock>;
  return (
    <div className={PAD}>
      <IconGrid
        icons={block.assets.map((asset) => ({ id: asset.id, name: asset.name, groupLabel: asset.groupLabel, file: asset.file }))}
      />
    </div>
  );
}

function BannersBody({ block, ctx }: { block: Of<"banners">; ctx: Ctx }) {
  if (block.assets.length === 0) return <EmptyBlock block={block} ctx={ctx}>Upload banners in the block settings</EmptyBlock>;
  const groups = new Map<string, GuideAsset[]>();
  for (const asset of block.assets) {
    const key = asset.groupLabel.trim() || "Other";
    groups.set(key, [...(groups.get(key) ?? []), asset]);
  }
  const showHeadings = groups.size > 1 || !groups.has("Other");

  return (
    <div className={cn(PAD, "space-y-12")}>
      {[...groups.entries()].map(([label, items]) => (
        <div key={label}>
          {showHeadings && <h3 className="mb-4 text-[14px] leading-[19.5px] text-guide-muted">{label}</h3>}
          <div className="grid gap-5 sm:grid-cols-2">
            {items.map(({ file, ...asset }) => (
              <figure key={asset.id} className="min-w-0">
                <div className="flex aspect-[3/2] items-center justify-center overflow-hidden rounded-[8px] bg-guide-tile p-6">
                  {isImageMime(file.mimeType) ? (
                    <img src={fileUrl(file.id, { preview: true })} alt={asset.name} loading="lazy" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <video src={fileUrl(file.id)} controls muted playsInline className="max-h-full max-w-full" />
                  )}
                </div>
                <figcaption className="mt-3 flex items-center justify-between gap-3 text-[14px] leading-[19.5px]">
                  <span className="min-w-0">
                    <span className="block truncate">{asset.name}</span>
                    <span className="block truncate text-guide-muted">
                      {file.width && file.height ? `${file.width} × ${file.height}px` : formatBytes(file.sizeBytes)}
                      {asset.description ? ` · ${asset.description}` : ""}
                    </span>
                  </span>
                  <DownloadMenu file={file} />
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FilesBody({ block, ctx }: { block: Of<"files">; ctx: Ctx }) {
  if (block.assets.length === 0) return <EmptyBlock block={block} ctx={ctx}>Upload files in the block settings</EmptyBlock>;
  return (
    <ul className={PAD}>
      {block.assets.map((asset) => (
        <li
          key={asset.id}
          className="grid items-center gap-x-5 gap-y-2 border-t border-guide-rule py-4 text-[14px] leading-[19.5px] last:border-b md:grid-cols-2"
        >
          <div className="min-w-0">
            <p className="truncate">{asset.name}</p>
            <p className="text-guide-muted">
              {extensionOf(asset.file.originalName).toUpperCase()} · {formatBytes(asset.file.sizeBytes)}
            </p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <p className="min-w-0 text-guide-muted">{asset.description}</p>
            <DownloadMenu file={asset.file} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function BlockBody({ block, ctx }: { block: GuideBlock; ctx: Ctx }) {
  switch (block.type) {
    case "text":
      return null;
    case "cards":
      return <CardsBody block={block} ctx={ctx} />;
    case "media":
      return <MediaBody block={block} ctx={ctx} />;
    case "colors":
      return <ColorsBody block={block} ctx={ctx} />;
    case "pairings":
      return <PairingsBody block={block} ctx={ctx} />;
    case "typeface":
      return <TypefaceBody block={block} ctx={ctx} />;
    case "typescale":
      return <TypescaleBody block={block} ctx={ctx} />;
    case "icons":
      return <IconsBody block={block} ctx={ctx} />;
    case "banners":
      return <BannersBody block={block} ctx={ctx} />;
    case "files":
      return <FilesBody block={block} ctx={ctx} />;
  }
}

/** One block of a guideline page: optional rule, header row, then its content. */
export function GuideBlockView({
  block,
  ctx,
  toolbar,
  selected = false,
}: {
  block: GuideBlock;
  ctx: Ctx;
  toolbar?: ReactNode;
  selected?: boolean;
}) {
  const band = block.type === "media" && block.data.band;
  const headed = ctx.edit || hasHeaderText(block);

  return (
    <section
      id={`b-${block.id}`}
      className={cn(
        "group/block relative scroll-mt-24",
        band ? "bg-guide-band py-[35px]" : "pb-16",
        !band && (headed ? "pt-5" : block.data.divider ? "pt-[35px]" : "pt-0"),
        !band && block.data.divider && "border-t border-guide-rule",
        selected && "outline-2 -outline-offset-2 outline-sky-500 outline-solid",
      )}
    >
      {toolbar}
      <BlockHeader block={block} ctx={ctx} />
      <BlockBody block={block} ctx={ctx} />
    </section>
  );
}
