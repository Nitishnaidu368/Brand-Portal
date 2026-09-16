export type Rgb = { r: number; g: number; b: number };

export function normalizeHex(input: string): string | null {
  const value = input.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(value)) {
    return `#${value
      .split("")
      .map((c) => c + c)
      .join("")}`.toUpperCase();
  }
  if (/^[0-9a-f]{6}$/i.test(value)) return `#${value}`.toUpperCase();
  return null;
}

export function hexToRgb(hex: string): Rgb {
  const normalized = normalizeHex(hex);
  if (!normalized) throw new Error(`Invalid hex color: ${hex}`);
  const int = parseInt(normalized.slice(1), 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

export function rgbToHsl({ r, g, b }: Rgb) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function rgbToCmyk({ r, g, b }: Rgb) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: Math.round(((1 - rn - k) / (1 - k)) * 100),
    m: Math.round(((1 - gn - k) / (1 - k)) * 100),
    y: Math.round(((1 - bn - k) / (1 - k)) * 100),
    k: Math.round(k * 100),
  };
}

function relativeLuminance({ r, g, b }: Rgb) {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string) {
  const la = relativeLuminance(hexToRgb(a));
  const lb = relativeLuminance(hexToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Black or white, whichever reads better on top of `hex`. */
export function readableTextColor(hex: string) {
  return contrastRatio(hex, "#FFFFFF") >= contrastRatio(hex, "#000000") ? "#FFFFFF" : "#000000";
}

export function colorValues(hex: string, cmykOverride?: string | null) {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);
  const cmyk = rgbToCmyk(rgb);
  return {
    hex: normalizeHex(hex)!,
    rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    cmyk: cmykOverride?.trim() || `${cmyk.c}, ${cmyk.m}, ${cmyk.y}, ${cmyk.k}`,
  };
}
