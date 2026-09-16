"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function PortalTabs({ portalId }: { portalId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/portals/${portalId}`;
  const tabs = [
    { href: base, label: "Pages", active: pathname === base },
    { href: `${base}/access`, label: "Access", active: pathname.startsWith(`${base}/access`) },
    { href: `${base}/settings`, label: "Settings", active: pathname.startsWith(`${base}/settings`) },
    { href: `${base}/activity`, label: "Activity", active: pathname.startsWith(`${base}/activity`) },
  ];

  return (
    <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-zinc-200" aria-label="Portal">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition",
            tab.active ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
