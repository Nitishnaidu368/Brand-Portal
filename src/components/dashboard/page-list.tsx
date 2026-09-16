"use client";

import { ArrowDown, ArrowUp, EyeOff, GripVertical, LayoutList } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { reorderPagesAction } from "@/lib/actions/guide";
import { pageNumber } from "@/lib/guide";
import { cn } from "@/lib/utils";
import { Button, buttonClasses } from "../ui/button";
import { EmptyState } from "../ui/card";

type Item = { id: string; title: string; summary: string; muted: boolean; href: string };

function moveItem(items: Item[], from: number, to: number) {
  if (from === to || to < 0 || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function PageList({ portalId, pages }: { portalId: string; pages: Item[] }) {
  const [items, setItems] = useState(pages);
  const [dragging, setDragging] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const savedOrder = useRef(pages.map((p) => p.id).join());

  function persist(next: Item[]) {
    const order = next.map((i) => i.id);
    if (order.join() === savedOrder.current) return;
    savedOrder.current = order.join();
    setError(null);
    startTransition(async () => {
      const result = await reorderPagesAction(portalId, order);
      if (result && !result.ok) setError(result.message ?? "Couldn't save the new order.");
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState icon={<LayoutList className="size-5" />} title="No pages yet">
        Add a page below to start the guideline.
      </EmptyState>
    );
  }

  return (
    <>
      <ul className="divide-y divide-zinc-100">
        {items.map((item, index) => (
          <li
            key={item.id}
            draggable
            onDragStart={(event) => {
              setDragging(item.id);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", item.id);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (!dragging || dragging === item.id) return;
              setItems(moveItem(items, items.findIndex((i) => i.id === dragging), index));
            }}
            onDrop={(event) => event.preventDefault()}
            onDragEnd={() => {
              setDragging(null);
              persist(items);
            }}
            className={cn("group flex items-center gap-3 bg-white px-3 py-3 transition sm:px-4", dragging === item.id && "opacity-40")}
          >
            <GripVertical className="size-4 shrink-0 cursor-grab text-zinc-300 group-hover:text-zinc-500" aria-hidden />
            <span className="w-6 shrink-0 text-sm text-zinc-400 tabular-nums">{pageNumber(index)}</span>
            <Link href={item.href} className="min-w-0 flex-1" draggable={false}>
              <p className={cn("flex items-center gap-1.5 truncate text-sm font-medium group-hover:underline", item.muted ? "text-zinc-500" : "text-zinc-900")}>
                {item.title}
                {item.muted && <EyeOff className="size-3.5 shrink-0 text-zinc-400" aria-label="Not visible to clients" />}
              </p>
              <p className="truncate text-xs text-zinc-500">{item.summary}</p>
            </Link>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Move ${item.title} up`}
                disabled={index === 0 || pending}
                onClick={() => {
                  const next = moveItem(items, index, index - 1);
                  setItems(next);
                  persist(next);
                }}
              >
                <ArrowUp />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Move ${item.title} down`}
                disabled={index === items.length - 1 || pending}
                onClick={() => {
                  const next = moveItem(items, index, index + 1);
                  setItems(next);
                  persist(next);
                }}
              >
                <ArrowDown />
              </Button>
              <Link href={item.href} className={buttonClasses("secondary", "sm", "ml-2")} draggable={false}>
                Edit
              </Link>
            </div>
          </li>
        ))}
      </ul>
      {error && <p className="border-t border-zinc-100 px-4 py-2 text-sm text-red-600">{error}</p>}
    </>
  );
}
