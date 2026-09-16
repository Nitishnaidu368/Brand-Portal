import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { Portal } from "@/lib/db/schema";
import { fileUrl } from "@/lib/formats";
import { cn } from "@/lib/utils";
import { accentStyle } from "../brand";
import { MobileNav, type NavItem } from "./mobile-nav";

export type { NavItem };

type ShellPortal = Pick<Portal, "clientName" | "accentColor" | "logoFileId" | "guideTitle">;

function Brand({ portal }: { portal: ShellPortal }) {
  if (portal.logoFileId) {
    return (
      <img
        src={fileUrl(portal.logoFileId, { preview: true })}
        alt={portal.clientName}
        className="h-[23px] w-auto max-w-[170px] object-contain object-left"
      />
    );
  }
  return <span className="block text-[19px] leading-[23px] font-medium tracking-[-0.02em]">{portal.clientName}</span>;
}

/**
 * The guideline frame: a fixed 210px sidebar (logo, guideline title, numbered pages) and the
 * selected page on the right. Measured from the reference at a 1280px viewport.
 */
export function GuideShell({
  portal,
  items,
  activeId,
  homeHref,
  top,
  sidebarFooter,
  drawerOpen = false,
  children,
}: {
  portal: ShellPortal;
  items: NavItem[];
  activeId: string | null;
  homeHref: string;
  /** A 48px bar pinned above the guideline (admin preview or editor toolbar). */
  top?: ReactNode;
  sidebarFooter?: ReactNode;
  drawerOpen?: boolean;
  children: ReactNode;
}) {
  const title = portal.guideTitle.trim() || `${portal.clientName}\nBrand Guidelines`;
  const style = { ...accentStyle(portal.accentColor), "--guide-top": top ? "48px" : "0px" } as CSSProperties;

  return (
    <div style={style} className="min-h-dvh bg-white text-black">
      {top}
      <MobileNav
        brand={
          <Link href={homeHref}>
            <Brand portal={portal} />
          </Link>
        }
        items={items}
        activeId={activeId}
        footer={sidebarFooter}
      />
      <div className="lg:flex">
        <aside className="sticky top-(--guide-top) hidden h-[calc(100dvh-var(--guide-top))] w-[210px] shrink-0 flex-col overflow-y-auto border-r border-[#E5E5E5] bg-white lg:flex">
          <Link href={homeHref} className="block h-[85px] shrink-0 border-b border-[#E5E5E5] px-[15px] pt-[10px]">
            <Brand portal={portal} />
          </Link>
          <p className="shrink-0 border-b border-[#E5E5E5] px-[18px] py-5 text-[13px] leading-[22px] whitespace-pre-line text-[#8C8C8C]">
            {title}
          </p>
          <nav aria-label="Brand guidelines" className="shrink-0">
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    aria-current={item.id === activeId ? "page" : undefined}
                    className={cn(
                      "block px-[18px] py-[9px] text-[13px] leading-[17.5px] transition-opacity hover:opacity-55",
                      item.id === activeId && "font-medium",
                      item.muted && "text-guide-faint",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {sidebarFooter && <div className="mt-auto shrink-0 border-t border-[#E5E5E5] px-[18px] py-4">{sidebarFooter}</div>}
        </aside>
        <div className={cn("min-w-0 flex-1", drawerOpen && "lg:pr-[420px]")}>{children}</div>
      </div>
    </div>
  );
}
