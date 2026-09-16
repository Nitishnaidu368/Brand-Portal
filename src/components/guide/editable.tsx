"use client";

import { useLayoutEffect, useRef, useState, useTransition, type CSSProperties, type ReactNode } from "react";
import { saveBlockTextAction, savePageTextAction } from "@/lib/actions/guide";
import { cn } from "@/lib/utils";

export type EditableTag = "div" | "p" | "h1" | "h2" | "span";

/**
 * Text on a guideline page that the admin edits in place. Shows the rendered text (passed as
 * children) until clicked, then swaps in a textarea with the same typography. Saves on blur or
 * Enter (Cmd/Ctrl+Enter in multi-line fields); Escape cancels.
 */
export function EditableText({
  target,
  value,
  placeholder,
  multiline = false,
  as: Tag = "div",
  className,
  style,
  children,
}: {
  target: { kind: "page" | "block"; id: string; field: string };
  value: string;
  placeholder: string;
  multiline?: boolean;
  as?: EditableTag;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  const shown = saving ?? value;

  function commit() {
    if (draft === null) return;
    const next = multiline ? draft : draft.replace(/\s*\n\s*/g, " ");
    setDraft(null);
    if (next === value) return;
    setError(null);
    setSaving(next);
    startTransition(async () => {
      const result =
        target.kind === "page"
          ? await savePageTextAction(target.id, target.field, next)
          : await saveBlockTextAction(target.id, target.field, next);
      if (result && !result.ok) setError(result.message ?? "Couldn't save that.");
      setSaving(null);
    });
  }

  if (draft !== null) {
    return (
      <textarea
        ref={ref}
        value={draft}
        rows={1}
        autoFocus
        placeholder={placeholder}
        aria-label={placeholder}
        onFocus={(event) => {
          const end = event.currentTarget.value.length;
          event.currentTarget.setSelectionRange(end, end);
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setDraft(null);
          } else if (event.key === "Enter" && (!multiline || event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        style={style}
        className={cn(
          className,
          "block w-full resize-none overflow-hidden bg-transparent p-0 text-inherit outline-2 outline-offset-4 outline-sky-500 outline-solid",
        )}
      />
    );
  }

  const empty = !shown.trim();
  const open = () => setDraft(shown);
  return (
    <Tag
      role="button"
      tabIndex={0}
      title="Click to edit"
      style={style}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a")) event.preventDefault();
        open();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      }}
      className={cn(
        className,
        "cursor-text rounded-[1px] outline-offset-4 outline-sky-500/70 hover:outline-1 hover:outline-solid focus-visible:outline-2 focus-visible:outline-solid",
        empty && "opacity-30",
        pending && "opacity-60",
      )}
    >
      {empty ? placeholder : saving !== null || !children ? <span className="whitespace-pre-wrap">{shown}</span> : children}
      {error && (
        <span role="alert" className="ml-2 align-middle font-sans text-xs font-normal tracking-normal text-red-600 not-italic">
          {error}
        </span>
      )}
    </Tag>
  );
}
