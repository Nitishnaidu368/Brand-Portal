"use client";

import { Download, ExternalLink } from "lucide-react";
import { useState } from "react";
import type { PublicFile } from "@/lib/files";
import { fileUrl } from "@/lib/formats";
import { weightName } from "@/lib/fonts";
import { buttonClasses } from "../ui/button";
import { Input } from "../ui/field";

export type TypeFamily = {
  key: string;
  family: string;
  source: "google" | "upload" | "system";
  usage: string;
  faces: { id: string; weight: number; style: "normal" | "italic"; cssFamily: string; file: PublicFile | null }[];
};

const SOURCE_LABEL = { google: "Google Fonts", upload: "Font files", system: "System font" };
const DEFAULT_SAMPLE = "The quick brown fox jumps over the lazy dog";

export function TypeTester({ families }: { families: TypeFamily[] }) {
  const [text, setText] = useState("");
  const [size, setSize] = useState(32);
  const sample = text.trim() || DEFAULT_SAMPLE;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type to preview every font…"
          aria-label="Preview text"
          className="sm:max-w-md"
        />
        <label className="flex items-center gap-3 text-sm text-zinc-500">
          Size
          <input
            type="range"
            min={16}
            max={72}
            value={size}
            onChange={(event) => setSize(Number(event.target.value))}
            className="w-32 accent-[var(--accent)]"
          />
          <span className="w-10 tabular-nums">{size}px</span>
        </label>
      </div>

      {families.map((family) => {
        const regular = family.faces.find((f) => f.weight === 400 && f.style === "normal") ?? family.faces[0];
        return (
          <article key={family.key} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[200px_minmax(0,1fr)]">
              <div>
                <p
                  className="text-[88px] leading-none text-zinc-900"
                  style={{ fontFamily: regular?.cssFamily, fontWeight: regular?.weight, fontStyle: regular?.style }}
                  aria-hidden
                >
                  Aa
                </p>
                <h3 className="mt-5 text-lg font-semibold text-zinc-900">{family.family}</h3>
                <p className="text-sm text-zinc-500">
                  {SOURCE_LABEL[family.source]} · {family.faces.length} {family.faces.length === 1 ? "style" : "styles"}
                </p>
                {family.usage && <p className="mt-3 text-sm text-zinc-600">{family.usage}</p>}
                {family.source === "google" && (
                  <a
                    href={`https://fonts.google.com/specimen/${encodeURIComponent(family.family).replace(/%20/g, "+")}`}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonClasses("secondary", "sm", "mt-4")}
                  >
                    <ExternalLink />
                    Google Fonts
                  </a>
                )}
              </div>
              <ul className="min-w-0 divide-y divide-zinc-100">
                {family.faces.map((face) => (
                  <li key={face.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-xs text-zinc-400">
                        {weightName(face.weight)} · {face.weight}
                        {face.style === "italic" ? " · Italic" : ""}
                      </p>
                      <p
                        className="truncate text-zinc-900"
                        style={{
                          fontFamily: face.cssFamily,
                          fontWeight: face.weight,
                          fontStyle: face.style,
                          fontSize: size,
                          lineHeight: 1.25,
                        }}
                      >
                        {sample}
                      </p>
                    </div>
                    {face.file && (
                      <a
                        href={fileUrl(face.file.id, { download: true })}
                        download
                        className={buttonClasses("ghost", "icon")}
                        aria-label={`Download ${family.family} ${weightName(face.weight)}`}
                        title="Download font file"
                      >
                        <Download />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        );
      })}
    </div>
  );
}
