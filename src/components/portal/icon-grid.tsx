"use client";

import { Check, Code2, Download, Search } from "lucide-react";
import { useState } from "react";
import type { PublicFile } from "@/lib/files";
import { fileUrl, isSvgMime } from "@/lib/formats";
import { Input } from "../ui/field";
import { useCopy } from "../use-copy";

type IconItem = { id: string; name: string; groupLabel: string; file: PublicFile };

const tileAction =
  "flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-md px-1.5 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 [&_svg]:size-3.5";

function IconTile({ icon }: { icon: IconItem }) {
  const { copied, copy } = useCopy();
  const svg = isSvgMime(icon.file.mimeType);

  return (
    <div className="group flex flex-col items-center rounded-xl border border-zinc-200 bg-white px-3 pt-5 pb-2 transition hover:border-zinc-300 hover:shadow-sm">
      <div className="flex h-14 w-full items-center justify-center">
        <img src={fileUrl(icon.file.id)} alt={icon.name} className="max-h-10 max-w-10" loading="lazy" />
      </div>
      <p className="mt-2 w-full truncate text-center text-xs text-zinc-600" title={icon.name}>
        {icon.name}
      </p>
      <div className="mt-2 flex items-center gap-0.5 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        {svg && (
          <button
            type="button"
            className={tileAction}
            title="Copy SVG code"
            aria-label={`Copy ${icon.name} SVG code`}
            onClick={() =>
              copy(
                fetch(fileUrl(icon.file.id)).then((res) => {
                  if (!res.ok) throw new Error("Couldn't load icon");
                  return res.text();
                }),
              )
            }
          >
            {copied ? <Check className="text-emerald-600" /> : <Code2 />}
          </button>
        )}
        <a
          href={fileUrl(icon.file.id, { download: true })}
          download
          className={tileAction}
          title={svg ? "Download SVG" : "Download"}
          aria-label={`Download ${icon.name}`}
        >
          <Download />
        </a>
        {svg && (
          <a
            href={fileUrl(icon.file.id, { variant: "png-4x", download: true })}
            download
            className={tileAction}
            title="Download PNG (4x)"
          >
            PNG
          </a>
        )}
      </div>
    </div>
  );
}

export function IconGrid({ icons }: { icons: IconItem[] }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? icons.filter((icon) => `${icon.name} ${icon.groupLabel}`.toLowerCase().includes(needle))
    : icons;

  return (
    <div>
      {icons.length > 6 && (
        <div className="relative mb-5 max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${icons.length} icons`}
            aria-label="Search icons"
            className="pl-9"
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">
        {filtered.map((icon) => (
          <IconTile key={icon.id} icon={icon} />
        ))}
      </div>
      {filtered.length === 0 && <p className="py-8 text-center text-sm text-zinc-500">No icons match “{query}”.</p>}
    </div>
  );
}
