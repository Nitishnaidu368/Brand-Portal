export function parseWeights(value: string) {
  const weights = value
    .split(/[,\s]+/)
    .map((w) => Number(w))
    .filter((w) => Number.isInteger(w) && w >= 100 && w <= 900);
  return [...new Set(weights)].sort((a, b) => a - b);
}

const WEIGHT_NAMES: Record<number, string> = {
  100: "Thin",
  200: "Extra Light",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semibold",
  700: "Bold",
  800: "Extra Bold",
  900: "Black",
};

export function weightName(weight: number) {
  return WEIGHT_NAMES[Math.round(weight / 100) * 100] ?? String(weight);
}

export function googleFontsHref(family: string, weights: number[]) {
  const name = encodeURIComponent(family).replace(/%20/g, "+");
  const list = weights.length ? weights : [400];
  return `https://fonts.googleapis.com/css2?family=${name}:wght@${list.join(";")}&display=swap`;
}
