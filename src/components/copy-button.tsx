"use client";

import { Check, Copy, Link2 } from "lucide-react";
import { Button, type ButtonSize, type ButtonVariant } from "./ui/button";
import { useCopy } from "./use-copy";

export function CopyButton({
  value,
  label = "Copy",
  variant = "secondary",
  size = "sm",
  className,
}: {
  value: string;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { copied, copy } = useCopy();
  return (
    <Button variant={variant} size={size} className={className} onClick={() => copy(value)}>
      {copied ? <Check /> : <Copy />}
      {copied ? "Copied" : label}
    </Button>
  );
}

/** Copies an absolute URL for a same-origin path. */
export function CopyLinkButton({ path, label = "Copy link" }: { path: string; label?: string }) {
  const { copied, copy } = useCopy();
  return (
    <Button variant="secondary" onClick={() => copy(new URL(path, window.location.origin).toString())}>
      {copied ? <Check /> : <Link2 />}
      {copied ? "Copied" : label}
    </Button>
  );
}
