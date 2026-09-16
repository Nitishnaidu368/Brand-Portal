import { colorValues, hexToRgb } from "./color";

export type ExportColor = {
  name: string;
  hex: string;
  cmyk?: string | null;
  pantone?: string | null;
  usage?: string | null;
};

export const COLOR_EXPORT_FORMATS = {
  css: { label: "CSS variables", ext: "css", mime: "text/css; charset=utf-8" },
  scss: { label: "SCSS variables", ext: "scss", mime: "text/x-scss; charset=utf-8" },
  tailwind: { label: "Tailwind theme", ext: "css", mime: "text/css; charset=utf-8" },
  json: { label: "Design tokens (JSON)", ext: "json", mime: "application/json; charset=utf-8" },
  ase: { label: "Adobe Swatch (.ase)", ext: "ase", mime: "application/octet-stream" },
} as const;

export type ColorExportFormat = keyof typeof COLOR_EXPORT_FORMATS;

export function isColorExportFormat(value: string): value is ColorExportFormat {
  return Object.hasOwn(COLOR_EXPORT_FORMATS, value);
}

export function tokenName(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "color"
  );
}

function withTokens<T extends ExportColor>(colors: T[]) {
  const seen = new Map<string, number>();
  return colors.map((color) => {
    const base = tokenName(color.name);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return { ...color, token: count === 1 ? base : `${base}-${count}` };
  });
}

export function toCss(colors: ExportColor[], title: string) {
  const lines = withTokens(colors).map((c) => `  --brand-${c.token}: ${c.hex};`);
  return `/* ${title} — brand colors */\n:root {\n${lines.join("\n")}\n}\n`;
}

export function toScss(colors: ExportColor[], title: string) {
  const lines = withTokens(colors).map((c) => `$brand-${c.token}: ${c.hex};`);
  return `// ${title} — brand colors\n${lines.join("\n")}\n`;
}

export function toTailwind(colors: ExportColor[], title: string) {
  const lines = withTokens(colors).map((c) => `  --color-brand-${c.token}: ${c.hex};`);
  return `/* ${title} — paste into your Tailwind v4 stylesheet, then use e.g. bg-brand-${
    withTokens(colors)[0]?.token ?? "primary"
  } */\n@theme {\n${lines.join("\n")}\n}\n`;
}

/** W3C Design Tokens Community Group format. */
export function toJsonTokens(colors: ExportColor[]) {
  const brand: Record<string, unknown> = {};
  for (const c of withTokens(colors)) {
    const values = colorValues(c.hex, c.cmyk);
    brand[c.token] = {
      $type: "color",
      $value: values.hex,
      ...(c.usage ? { $description: c.usage } : {}),
      $extensions: {
        name: c.name,
        rgb: values.rgb,
        hsl: values.hsl,
        cmyk: values.cmyk,
        ...(c.pantone ? { pantone: c.pantone } : {}),
      },
    };
  }
  return `${JSON.stringify({ brand }, null, 2)}\n`;
}

/** Adobe Swatch Exchange (v1.0), readable by Illustrator, Photoshop and InDesign. */
export function toAse(colors: ExportColor[]): Uint8Array<ArrayBuffer> {
  const blocks = colors.map((c) => {
    const name = `${c.name}\0`;
    // name length (u16) + UTF-16BE name + model (4) + RGB floats (12) + color type (u16)
    const length = 2 + name.length * 2 + 4 + 12 + 2;
    return { name, length, rgb: hexToRgb(c.hex) };
  });
  const total = 12 + blocks.reduce((sum, b) => sum + 6 + b.length, 0);
  const view = new DataView(new ArrayBuffer(total));
  let offset = 0;
  const writeAscii = (text: string) => {
    for (const ch of text) view.setUint8(offset++, ch.charCodeAt(0));
  };

  writeAscii("ASEF");
  view.setUint16(offset, 1);
  view.setUint16(offset + 2, 0);
  view.setUint32(offset + 4, blocks.length);
  offset += 8;

  for (const block of blocks) {
    view.setUint16(offset, 0x0001);
    view.setUint32(offset + 2, block.length);
    view.setUint16(offset + 6, block.name.length);
    offset += 8;
    for (let i = 0; i < block.name.length; i++) {
      view.setUint16(offset, block.name.charCodeAt(i));
      offset += 2;
    }
    writeAscii("RGB ");
    view.setFloat32(offset, block.rgb.r / 255);
    view.setFloat32(offset + 4, block.rgb.g / 255);
    view.setFloat32(offset + 8, block.rgb.b / 255);
    view.setUint16(offset + 12, 2); // normal (non-global, non-spot)
    offset += 14;
  }
  return new Uint8Array(view.buffer);
}

export function renderColorExport(format: ColorExportFormat, colors: ExportColor[], title: string) {
  switch (format) {
    case "css":
      return toCss(colors, title);
    case "scss":
      return toScss(colors, title);
    case "tailwind":
      return toTailwind(colors, title);
    case "json":
      return toJsonTokens(colors);
    case "ase":
      return toAse(colors);
  }
}

export function colorExportFilename(format: ColorExportFormat, slug: string) {
  const base = format === "tailwind" ? `${slug}-tailwind-theme` : `${slug}-colors`;
  return `${base}.${COLOR_EXPORT_FORMATS[format].ext}`;
}
