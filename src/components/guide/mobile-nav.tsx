"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type NavItem = { id: string; label: string; href: string; muted?: boolean };

/** Below the lg breakpoint the sidebar collapses into a top bar with a menu. */
export function MobileNav({
  brand,
  items,
  activeId,
  footer,
}: {
  brand: ReactNode;
  items: NavItem[];
  activeId: string | null;
  footer?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-(--guide-top) z-30 border-b border-[#E5E5E5] bg-white lg:hidden">
      <div className="flex h-14 items-center justify-between px-5">
        {brand}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="-mr-2 flex size-10 cursor-pointer items-center justify-center"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <nav
          aria-label="Brand guidelines"
          className="max-h-[calc(100dvh-3.5rem-var(--guide-top))] overflow-y-auto border-t border-[#E5E5E5] pb-3"
        >
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={item.id === activeId ? "page" : undefined}
                  className={cn(
                    "block px-5 py-3 text-[15px]",
                    item.id === activeId && "font-medium",
                    item.muted && "text-guide-faint",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          {footer && <div className="mt-2 border-t border-[#E5E5E5] px-5 pt-3">{footer}</div>}
        </nav>
      )}
    </div>
  );
}
