/** "primary_logo-dark.svg" → "Primary Logo Dark" */
export function humanizeFilename(name: string) {
  return (
    name
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase()) || "Untitled"
  );
}

// Order matters: compound names must be tested before the words they contain.
const WEIGHT_PATTERNS: [RegExp, number][] = [
  [/hairline|thin/i, 100],
  [/extra\s?light|ultra\s?light/i, 200],
  [/light/i, 300],
  [/semi\s?bold|demi\s?bold/i, 600],
  [/extra\s?bold|ultra\s?bold/i, 800],
  [/black|heavy/i, 900],
  [/bold/i, 700],
  [/medium/i, 500],
];

/** Best guess at family, weight and style from a font filename like "PlayfairDisplay-SemiBoldItalic.woff2". */
export function guessFontDetails(filename: string) {
  const base = filename.replace(/\.[a-z0-9]+$/i, "");
  const [familyPart, ...rest] = base.split(/[-_]/);
  const descriptor = rest.join(" ");
  const family =
    familyPart
      .replace(/\[.*?\]/g, "")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .trim() || "Custom font";
  const weight = WEIGHT_PATTERNS.find(([pattern]) => pattern.test(descriptor))?.[1] ?? 400;
  const style: "normal" | "italic" = /italic|oblique/i.test(descriptor) ? "italic" : "normal";
  return { family, weight, style };
}

const PLATFORM_SIZES: { width: number; height: number; label: string }[] = [
  { width: 1584, height: 396, label: "LinkedIn" },
  { width: 1128, height: 191, label: "LinkedIn" },
  { width: 1500, height: 500, label: "X / Twitter" },
  { width: 1600, height: 900, label: "X / Twitter" },
  { width: 1080, height: 1080, label: "Instagram" },
  { width: 1080, height: 1350, label: "Instagram" },
  { width: 1080, height: 1920, label: "Stories" },
  { width: 820, height: 312, label: "Facebook" },
  { width: 1200, height: 630, label: "Open Graph" },
  { width: 2560, height: 1440, label: "YouTube" },
  { width: 1280, height: 720, label: "YouTube" },
  { width: 1000, height: 1500, label: "Pinterest" },
  { width: 600, height: 200, label: "Email" },
];

export function guessPlatform(width: number, height: number) {
  for (const size of PLATFORM_SIZES) {
    for (const scale of [1, 2]) {
      if (width === size.width * scale && height === size.height * scale) return size.label;
    }
  }
  return "";
}
