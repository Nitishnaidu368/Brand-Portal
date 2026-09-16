"use client";

import { Check, Copy } from "lucide-react";
import { colorValues, readableTextColor } from "@/lib/color";
import { cn } from "@/lib/utils";
import { useCopy } from "../use-copy";

type ColorLike = { name: string; hex: string; cmyk: string | null; pantone: string | null; usage: string };

function CopyRow({ label, value }: { label: string; value: string }) {
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(value)}
      className="group flex w-full cursor-pointer items-center gap-3 px-5 py-2.5 text-left transition hover:bg-zinc-50"
      aria-label={`Copy ${label} ${value}`}
    >
      <span className="w-16 shrink-0 text-[11px] font-medium tracking-wide text-zinc-400 uppercase">{label}</span>
      <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-zinc-800">{value}</span>
      {copied ? (
        <Check className="size-4 shrink-0 text-emerald-600" />
      ) : (
        <Copy className="size-4 shrink-0 text-zinc-300 transition group-hover:text-zinc-500" />
      )}
    </button>
  );
}

export function ColorCard({ color }: { color: ColorLike }) {
  const values = colorValues(color.hex, color.cmyk);
  const foreground = readableTextColor(values.hex);
  const { copied, copy } = useCopy();
  const rows: [string, string][] = [
    ["HEX", values.hex],
    ["RGB", values.rgb],
    ["HSL", values.hsl],
    ["CMYK", values.cmyk],
  ];
  if (color.pantone) rows.push(["Pantone", color.pantone]);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={() => copy(values.hex)}
        className="group relative flex h-40 w-full cursor-pointer flex-col justify-end p-5 text-left"
        style={{ backgroundColor: values.hex, color: foreground }}
        aria-label={`Copy ${color.name} ${values.hex}`}
      >
        <span
          className={cn(
            "absolute top-4 right-4 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition",
            copied ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
          )}
          style={{ backgroundColor: foreground === "#FFFFFF" ? "rgba(255,255,255,.18)" : "rgba(0,0,0,.07)" }}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy HEX"}
        </span>
        <span className="text-lg leading-tight font-semibold">{color.name}</span>
        <span className="mt-0.5 font-mono text-sm opacity-75">{values.hex}</span>
      </button>
      <div className="divide-y divide-zinc-100">
        {rows.map(([label, value]) => (
          <CopyRow key={label} label={label} value={value} />
        ))}
      </div>
      {color.usage && <p className="border-t border-zinc-100 px-5 py-3 text-sm text-zinc-500">{color.usage}</p>}
    </div>
  );
}
