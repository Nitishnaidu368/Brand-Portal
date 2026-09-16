"use client";

import { useCallback, useEffect, useRef, useState } from "react";

async function writeClipboard(value: string | Promise<string>) {
  // Safari only allows clipboard writes during the click, so async text goes through ClipboardItem.
  if (typeof value !== "string" && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      const blob = value.then((text) => new Blob([text], { type: "text/plain" }));
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
      return;
    } catch {
      // fall through to writeText
    }
  }
  const text = await value;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  el.remove();
}

export function useCopy(resetAfter = 1600) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (value: string | Promise<string>) => {
      try {
        await writeClipboard(value);
      } catch {
        return false;
      }
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), resetAfter);
      return true;
    },
    [resetAfter],
  );

  return { copied, copy };
}
