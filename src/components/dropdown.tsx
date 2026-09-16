"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { buttonClasses } from "./ui/button";

export function Dropdown({
  label,
  children,
  align = "right",
  buttonClassName,
  ariaLabel,
}: {
  label: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  buttonClassName?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((value) => !value)}
        className={buttonClassName ?? buttonClasses("secondary", "sm")}
      >
        {label}
      </button>
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={cn(
            "absolute z-30 mt-1.5 min-w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg shadow-zinc-900/5",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownLink({ href, children, download = true }: { href: string; children: ReactNode; download?: boolean }) {
  return (
    <a
      href={href}
      download={download || undefined}
      role="menuitem"
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm whitespace-nowrap text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
    >
      {children}
    </a>
  );
}
