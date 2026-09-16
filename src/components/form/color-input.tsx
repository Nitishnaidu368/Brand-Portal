"use client";

import { useState } from "react";
import { normalizeHex } from "@/lib/color";
import { Input } from "../ui/field";

export function ColorInput({
  name,
  id,
  defaultValue = "",
  placeholder = "#0F3D3E",
}: {
  name: string;
  id?: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const hex = normalizeHex(value);

  return (
    <div className="flex items-center gap-2">
      <label
        className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-zinc-200 shadow-xs"
        style={{ backgroundColor: hex ?? "#ffffff" }}
      >
        <span className="sr-only">Pick a color</span>
        <input
          type="color"
          value={(hex ?? "#000000").toLowerCase()}
          onChange={(event) => setValue(event.target.value.toUpperCase())}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
      <Input
        id={id}
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => hex && setValue(hex)}
        placeholder={placeholder}
        maxLength={7}
        spellCheck={false}
        autoComplete="off"
        className="font-mono uppercase"
        required
      />
    </div>
  );
}
