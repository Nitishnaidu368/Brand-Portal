import type { CSSProperties, ReactNode } from "react";
import { readableTextColor } from "@/lib/color";
import { fileUrl } from "@/lib/formats";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#18181B" />
      <path d="M9 11.5A2.5 2.5 0 0 1 11.5 9h9a2.5 2.5 0 0 1 0 5h-9A2.5 2.5 0 0 1 9 11.5Z" fill="#fff" />
      <path d="M9 20.5a2.5 2.5 0 0 1 2.5-2.5h4a2.5 2.5 0 0 1 0 5h-4A2.5 2.5 0 0 1 9 20.5Z" fill="#fff" opacity=".55" />
      <circle cx="21.5" cy="20.5" r="2.5" fill="#fff" opacity=".85" />
    </svg>
  );
}

export function accentStyle(hex: string) {
  return { "--accent": hex, "--accent-foreground": readableTextColor(hex) } as CSSProperties;
}

const avatarSizes = {
  sm: "size-8 rounded-lg text-xs",
  md: "size-11 rounded-xl text-sm",
  lg: "size-14 rounded-2xl text-base",
};

export function PortalAvatar({
  portal,
  size = "md",
  className,
}: {
  portal: { clientName: string; accentColor: string; logoFileId: string | null };
  size?: keyof typeof avatarSizes;
  className?: string;
}) {
  if (portal.logoFileId) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden border border-zinc-200 bg-white p-1.5",
          avatarSizes[size],
          className,
        )}
      >
        <img src={fileUrl(portal.logoFileId, { preview: true })} alt="" className="max-h-full max-w-full object-contain" />
      </div>
    );
  }
  const initials = portal.clientName
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center font-semibold", avatarSizes[size], className)}
      style={{ backgroundColor: portal.accentColor, color: readableTextColor(portal.accentColor) }}
    >
      {initials}
    </div>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark className="size-10" />
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-zinc-900">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-zinc-500">{subtitle}</p>}
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-zinc-500">{footer}</div>}
      </div>
    </div>
  );
}
