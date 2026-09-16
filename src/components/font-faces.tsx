import type { PublicFile } from "@/lib/files";
import { googleFontsHref, parseWeights } from "@/lib/fonts";

const CSS_FORMAT: Record<string, string> = {
  "font/woff2": "woff2",
  "font/woff": "woff",
  "font/ttf": "truetype",
  "font/otf": "opentype",
};

type FontLike = {
  id: string;
  family: string;
  source: string;
  weights: string;
  style: string;
  file: PublicFile | null;
};

/** CSS family name used to render an uploaded font file. */
export function uploadedFontFamily(fontId: string) {
  return `"bp-${fontId}", sans-serif`;
}

/**
 * Loads fonts for previews: Google Fonts via stylesheet links, uploaded files via @font-face.
 * Uploaded faces are registered under their row id, so no user text reaches the CSS.
 */
export function FontFaces({ fonts }: { fonts: FontLike[] }) {
  const googleHrefs = [
    ...new Set(
      fonts.filter((f) => f.source === "google").map((f) => googleFontsHref(f.family, parseWeights(f.weights))),
    ),
  ];
  const css = fonts
    .filter((f) => f.source === "upload" && f.file)
    .map((f) => {
      const format = CSS_FORMAT[f.file!.mimeType] ?? "woff2";
      const weight = parseWeights(f.weights)[0] ?? 400;
      const style = f.style === "italic" ? "italic" : "normal";
      return `@font-face{font-family:"bp-${f.id}";src:url("/api/files/${f.file!.id}") format("${format}");font-weight:${weight};font-style:${style};font-display:swap}`;
    })
    .join("\n");

  return (
    <>
      {googleHrefs.map((href) => (
        <link key={href} rel="stylesheet" href={href} precedence="default" />
      ))}
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
    </>
  );
}
