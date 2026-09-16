"use client";

import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Text scaled to exactly fill its container's width, cropped from cap height to baseline, like the
 * giant wordmark at the foot of the reference guideline.
 */
export function FitText({ text, className }: { text: string; className?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const span = textRef.current;
    if (!box || !span) return;
    const fit = () => {
      span.style.fontSize = "100px";
      const width = span.scrollWidth;
      if (width > 0) span.style.fontSize = `${(box.clientWidth / width) * 100}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    document.fonts?.ready.then(fit);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div ref={boxRef} className={cn("overflow-hidden", className)} aria-label={text}>
      {/* Line height equal to Inter's cap height puts the baseline at the bottom edge. */}
      <span
        ref={textRef}
        aria-hidden
        className="block w-max leading-[0.727] tracking-[-0.035em] whitespace-nowrap"
        style={{ fontSize: "14vw" }}
      >
        {text}
      </span>
    </div>
  );
}
