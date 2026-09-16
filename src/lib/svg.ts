import createDOMPurify, { type DOMPurify } from "dompurify";
import { JSDOM } from "jsdom";

let purifier: DOMPurify | null = null;

function getPurifier() {
  if (!purifier) {
    const { window } = new JSDOM("");
    purifier = createDOMPurify(window as unknown as Window & typeof globalThis);
  }
  return purifier;
}

/**
 * Strip scripts, event handlers, foreignObject and other active content from an uploaded SVG.
 * Returns a standalone SVG document string, or null if nothing usable is left.
 */
export function sanitizeSvg(input: string): string | null {
  const source = input
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!DOCTYPE[^[>]*(\[[\s\S]*?\])?\s*>/gi, "")
    .trim();

  const clean = getPurifier().sanitize(source, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["foreignObject", "script", "iframe", "embed", "object"],
  });

  const start = clean.indexOf("<svg");
  const end = clean.lastIndexOf("</svg>");
  if (start === -1 || end === -1) return null;

  let svg = clean.slice(start, end + "</svg>".length);
  if (!/^<svg[^>]*\sxmlns=/.test(svg)) {
    svg = svg.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  // HTML serialisation emits named entities that aren't valid in standalone XML.
  return svg.replace(/&nbsp;/g, "&#160;");
}
