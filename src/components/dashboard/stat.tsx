import type { ReactNode } from "react";
import { Card } from "../ui/card";

export function Stat({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
  return (
    <Card className="flex items-center gap-4 px-5 py-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 [&_svg]:size-5">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums">{value}</p>
        <p className="truncate text-sm text-zinc-500">{label}</p>
      </div>
    </Card>
  );
}
