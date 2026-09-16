"use client";

import { AlertCircle, CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

type UploadItem = {
  id: number;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
};

function uploadFile(file: File, fields: Record<string, string>, onProgress: (fraction: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let message = `Upload failed (${xhr.status})`;
      try {
        message = JSON.parse(xhr.responseText).error ?? message;
      } catch {
        // non-JSON error body
      }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("Network error. Check your connection and try again."));

    const body = new FormData();
    for (const [key, value] of Object.entries(fields)) body.set(key, value);
    body.set("file", file);
    xhr.send(body);
  });
}

export function UploadDropzone({
  fields,
  accept,
  multiple = true,
  title = "Drop files here",
  hint,
  compact = false,
}: {
  fields: Record<string, string>;
  accept?: string;
  multiple?: boolean;
  title?: string;
  hint?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const busy = items.some((item) => item.status === "uploading");

  async function handleFiles(list: FileList | null) {
    const selected = Array.from(list ?? []).slice(0, multiple ? undefined : 1);
    if (selected.length === 0) return;

    const batch: UploadItem[] = selected.map((file) => ({
      id: ++nextId.current,
      name: file.name,
      progress: 0,
      status: "uploading",
    }));
    setItems((prev) => [...prev.filter((item) => item.status === "uploading"), ...batch]);
    const patch = (id: number, update: Partial<UploadItem>) =>
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...update } : item)));

    for (const [index, file] of selected.entries()) {
      const { id } = batch[index];
      try {
        await uploadFile(file, fields, (progress) => patch(id, { progress }));
        patch(id, { status: "done", progress: 1 });
      } catch (error) {
        patch(id, { status: "error", error: (error as Error).message });
      }
    }

    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
    setTimeout(() => setItems((prev) => prev.filter((item) => item.status !== "done")), 2500);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-disabled={busy}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition focus-visible:ring-4 focus-visible:ring-zinc-900/10 focus-visible:outline-none",
          compact ? "px-4 py-6" : "px-6 py-10",
          dragging ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/60",
        )}
      >
        <div className="flex size-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
          {busy ? <Loader2 className="size-5 animate-spin" /> : <UploadCloud className="size-5" />}
        </div>
        <p className="mt-3 text-sm font-medium text-zinc-900">
          {title} <span className="font-normal text-zinc-500">or</span>{" "}
          <span className="underline underline-offset-4">browse</span>
        </p>
        {hint && <p className="mt-1 max-w-md text-xs text-zinc-500">{hint}</p>}
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={accept}
          multiple={multiple}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>

      {items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-zinc-200 px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                {item.status === "uploading" && <Loader2 className="size-4 shrink-0 animate-spin text-zinc-400" />}
                {item.status === "done" && <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />}
                {item.status === "error" && <AlertCircle className="size-4 shrink-0 text-red-600" />}
                <span className="min-w-0 flex-1 truncate text-zinc-800">{item.name}</span>
                <span className="text-xs text-zinc-500 tabular-nums">
                  {item.status === "uploading" ? `${Math.round(item.progress * 100)}%` : item.status === "done" ? "Uploaded" : ""}
                </span>
              </div>
              {item.status === "uploading" && (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-full bg-zinc-900 transition-[width]" style={{ width: `${item.progress * 100}%` }} />
                </div>
              )}
              {item.error && <p className="mt-1 text-xs text-red-600">{item.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
