"use client";

import { colorValues, hexToRgb, readableTextColor } from "@/lib/color";
import type { Color } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { useCopy } from "../use-copy";

const GRID: Record<number, string> = {
  0: "grid-cols-2 md:auto-cols-fr md:grid-flow-col md:grid-cols-none",
  2: "grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-5",
  6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
};

const HEIGHT = {
  row: { tall: "h-[320px] lg:h-[474px]", short: "h-[220px]" },
  grid: { tall: "h-[220px]", short: "h-[156px]" },
};

function CopyValue({ label, display, value }: { label: string; display: string; value: string }) {
  const { copied, copy } = useCopy();
  return (
    <>
      <dt>{label}:</dt>
      <dd className="min-w-0">
        <button
          type="button"
          onClick={() => copy(value)}
          title={`Copy ${value}`}
          className="max-w-full cursor-pointer truncate text-left underline-offset-2 hover:underline"
        >
          {copied ? "Copied" : display}
        </button>
      </dd>
    </>
  );
}

function Swatch({ color, className }: { color: Color; className: string }) {
  const values = colorValues(color.hex, color.cmyk);
  const { r, g, b } = hexToRgb(values.hex);

  return (
    <div
      title={color.usage || undefined}
      className={cn("flex min-w-0 flex-col justify-end p-4 text-[11px] leading-[16px] sm:p-5 sm:text-[12px] sm:leading-[16.5px]", className)}
      style={{ backgroundColor: values.hex, color: readableTextColor(values.hex) }}
    >
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3.5">
        <CopyValue label="Name" display={color.name} value={color.name} />
        <CopyValue label="CMYK" display={values.cmyk.replace(/\s*,\s*/g, "/")} value={values.cmyk} />
        <CopyValue label="RGB" display={`${r}/${g}/${b}`} value={values.rgb} />
        <CopyValue label="HEX" display={values.hex} value={values.hex} />
        {color.pantone && <CopyValue label="PMS" display={color.pantone} value={color.pantone} />}
      </dl>
    </div>
  );
}

/** Edge-to-edge swatches with Name, CMYK, RGB and HEX in the corner; click any value to copy it. */
export function ColorSwatches({ colors, columns, height }: { colors: Color[]; columns: number; height: "tall" | "short" }) {
  const layout = columns === 0 ? "row" : "grid";
  return (
    <div className={cn("grid", GRID[columns] ?? GRID[0])}>
      {colors.map((color) => (
        <Swatch key={color.id} color={color} className={HEIGHT[layout][height]} />
      ))}
    </div>
  );
}
