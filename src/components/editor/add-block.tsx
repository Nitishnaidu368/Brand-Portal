"use client";

import { Loader2, Plus } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { addBlockAction } from "@/lib/actions/guide";
import type { BlockType } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export type BlockChoice = { type: BlockType; label: string; description: string };

/** "Add block" control between blocks: a thin line that appears on hover, with a menu of block types. */
export function AddBlock({
  pageId,
  index,
  choices,
  standalone = false,
}: {
  pageId: string;
  index: number;
  choices: BlockChoice[];
  /** Always visible with its own spacing, for pages without blocks. */
  standalone?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, dispatch, pending] = useActionState(addBlockAction, null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state && !state.ok && state.message) window.alert(state.message);
  }, [state]);

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

  function add(type: BlockType) {
    setOpen(false);
    const formData = new FormData();
    formData.set("pageId", pageId);
    formData.set("type", type);
    formData.set("index", String(index));
    startTransition(() => dispatch(formData));
  }

  return (
    <div ref={ref} className={cn("group/add relative z-10 font-sans", standalone ? "px-5 py-10 sm:px-[35px]" : "h-0")}>
      <div
        className={cn(
          "flex items-center transition",
          !standalone && "absolute inset-x-5 -top-3 h-6 opacity-0 group-hover/add:opacity-100 focus-within:opacity-100 sm:inset-x-[35px]",
          (open || pending) && "opacity-100",
        )}
      >
        <span className="h-px flex-1 bg-sky-500/60" />
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-haspopup="menu"
          disabled={pending}
          className="mx-2 inline-flex h-6 cursor-pointer items-center gap-1 rounded-full bg-sky-500 px-2.5 text-[11px] font-medium text-white shadow-sm transition hover:bg-sky-600"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          Add block
        </button>
        <span className="h-px flex-1 bg-sky-500/60" />
      </div>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute left-1/2 z-30 grid w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 gap-1 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl sm:grid-cols-2",
            standalone ? "top-[4.5rem]" : "top-4",
          )}
        >
          {choices.map((choice) => (
            <button
              key={choice.type}
              type="button"
              role="menuitem"
              onClick={() => add(choice.type)}
              className="cursor-pointer rounded-lg px-3 py-2 text-left transition hover:bg-zinc-100"
            >
              <span className="block text-[13px] font-medium text-zinc-900">{choice.label}</span>
              <span className="block text-[12px] leading-snug text-zinc-500">{choice.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
