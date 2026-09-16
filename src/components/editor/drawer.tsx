import { X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClasses } from "../ui/button";

/** Right-hand settings panel in the editor, opened with a URL parameter so it survives refreshes. */
export function Drawer({
  title,
  description,
  closeHref,
  children,
}: {
  title: string;
  description?: string;
  closeHref: string;
  children: ReactNode;
}) {
  return (
    <aside
      aria-label={title}
      className="fixed top-12 right-0 bottom-0 z-40 flex w-full flex-col border-l border-zinc-200 bg-zinc-50 font-sans text-zinc-900 shadow-2xl sm:w-[420px]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-zinc-200 bg-white px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-zinc-500">{description}</p>}
        </div>
        <Link href={closeHref} scroll={false} aria-label="Close" className={buttonClasses("ghost", "icon", "-mr-2")}>
          <X />
        </Link>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">{children}</div>
    </aside>
  );
}
