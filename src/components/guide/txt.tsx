import type { CSSProperties } from "react";
import Markdown from "react-markdown";
import { cn } from "@/lib/utils";
import { EditableText, type EditableTag } from "./editable";

/** Where edits to a piece of text are saved, or null when rendering for clients. */
export type EditTarget = { kind: "page" | "block"; id: string } | null;

export function RichText({ value, className }: { value: string; className?: string }) {
  return (
    <div className={cn("guide-prose", className)}>
      <Markdown components={{ a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer" /> }}>
        {value}
      </Markdown>
    </div>
  );
}

/**
 * A text field of a page or block. Clients get plain (or Markdown) text and nothing at all when
 * it's empty; in the editor it becomes click-to-edit, with a placeholder when empty.
 */
export function Txt({
  edit,
  field,
  value,
  placeholder,
  as: Tag = "div",
  className,
  style,
  multiline = false,
  markdown = false,
}: {
  edit: EditTarget;
  field: string;
  value: string;
  placeholder: string;
  as?: EditableTag;
  className?: string;
  style?: CSSProperties;
  multiline?: boolean;
  markdown?: boolean;
}) {
  const classes = cn(multiline && !markdown && "whitespace-pre-line", className);
  const rendered = markdown ? <RichText value={value} /> : value;

  if (!edit) {
    if (!value.trim()) return null;
    return (
      <Tag className={classes} style={style}>
        {rendered}
      </Tag>
    );
  }
  return (
    <EditableText
      target={{ ...edit, field }}
      value={value}
      placeholder={placeholder}
      multiline={multiline}
      as={Tag}
      className={classes}
      style={style}
    >
      {value.trim() ? rendered : null}
    </EditableText>
  );
}
