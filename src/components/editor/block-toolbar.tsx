import { ArrowDown, ArrowUp, Copy, Settings2, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteBlockAction, duplicateBlockAction, moveBlockAction } from "@/lib/actions/guide";
import { BLOCK_META } from "@/lib/blocks";
import type { GuideBlock } from "@/lib/guide";
import { cn } from "@/lib/utils";
import { ActionButton } from "../ui/action-button";
import { buttonClasses } from "../ui/button";

/** Floating controls shown when hovering a block in the editor. */
export function BlockToolbar({
  block,
  first,
  last,
  selected,
}: {
  block: GuideBlock;
  first: boolean;
  last: boolean;
  selected: boolean;
}) {
  const { label, items } = BLOCK_META[block.type];
  const canDuplicate = items !== "assets" && items !== "fonts";

  return (
    <div
      className={cn(
        "absolute top-2 right-3 z-20 flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-white p-0.5 font-sans text-zinc-900 shadow-sm transition sm:right-[35px]",
        selected ? "opacity-100" : "opacity-0 group-hover/block:opacity-100 focus-within:opacity-100",
      )}
    >
      <span className="px-2 text-[11px] font-medium text-zinc-500">{label}</span>
      <Link href={`?block=${block.id}`} scroll={false} className={buttonClasses("ghost", "sm")}>
        <Settings2 />
        Settings
      </Link>
      <ActionButton
        action={moveBlockAction}
        fields={{ blockId: block.id, direction: "up" }}
        variant="ghost"
        size="icon"
        disabled={first}
        aria-label="Move block up"
        title="Move up"
      >
        <ArrowUp />
      </ActionButton>
      <ActionButton
        action={moveBlockAction}
        fields={{ blockId: block.id, direction: "down" }}
        variant="ghost"
        size="icon"
        disabled={last}
        aria-label="Move block down"
        title="Move down"
      >
        <ArrowDown />
      </ActionButton>
      {canDuplicate && (
        <ActionButton
          action={duplicateBlockAction}
          fields={{ blockId: block.id }}
          variant="ghost"
          size="icon"
          aria-label="Duplicate block"
          title="Duplicate"
        >
          <Copy />
        </ActionButton>
      )}
      <ActionButton
        action={deleteBlockAction}
        fields={{ blockId: block.id }}
        confirm="Delete this block and everything in it?"
        variant="dangerGhost"
        size="icon"
        aria-label="Delete block"
        title="Delete"
      >
        <Trash2 />
      </ActionButton>
    </div>
  );
}
