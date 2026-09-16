import { LogOut } from "lucide-react";
import Link from "next/link";
import { LogoMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions/auth";
import { requireAdmin } from "@/lib/auth/admin";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <LogoMark />
            <span className="truncate font-semibold text-zinc-900">{admin.agencyName}</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-zinc-500 sm:block">{admin.email}</span>
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
