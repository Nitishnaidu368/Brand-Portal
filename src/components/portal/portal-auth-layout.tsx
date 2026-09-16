import type { ReactNode } from "react";
import type { Portal } from "@/lib/db/schema";
import { fileUrl } from "@/lib/formats";
import { accentStyle } from "../brand";

/** Quiet, centered sign-in screen in the client's colors. */
export function PortalAuthLayout({ portal, children }: { portal: Portal; children: ReactNode }) {
  const subtitle = portal.guideTitle.split("\n")[0]?.trim() || "Brand guidelines";
  return (
    <div style={accentStyle(portal.accentColor)} className="flex min-h-dvh flex-col bg-[#F7F7F7] text-black">
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-[300px]">
          <div className="mb-10 flex flex-col items-center text-center">
            {portal.logoFileId ? (
              <img
                src={fileUrl(portal.logoFileId, { preview: true })}
                alt={portal.clientName}
                className="h-8 w-auto max-w-[220px] object-contain"
              />
            ) : (
              <p className="text-[22px] leading-tight font-medium tracking-[-0.02em]">{portal.clientName}</p>
            )}
            <p className="mt-3 text-[13px] text-guide-muted">{subtitle}</p>
          </div>
          {children}
        </div>
      </main>
      <p className="px-6 pb-6 text-center text-[12px] text-guide-faint">Private portal. Please don&apos;t share your access.</p>
    </div>
  );
}
