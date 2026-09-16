"use client";

import { useState } from "react";
import { slugify } from "@/lib/utils";
import { Field, Input } from "../ui/field";

/** Client name + portal URL, with the URL following the name until it's edited by hand. */
export function ClientIdentityFields({ defaultName = "", defaultSlug = "" }: { defaultName?: string; defaultSlug?: string }) {
  const [name, setName] = useState(defaultName);
  const [slug, setSlug] = useState(defaultSlug);
  const [slugEdited, setSlugEdited] = useState(Boolean(defaultSlug));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Client name" htmlFor="clientName" name="clientName">
        <Input
          id="clientName"
          name="clientName"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (!slugEdited) setSlug(slugify(event.target.value));
          }}
          placeholder="Tidewater Coffee"
          required
          autoFocus={!defaultName}
        />
      </Field>
      <Field label="Portal URL" htmlFor="slug" name="slug">
        <div className="flex h-9 items-center rounded-lg border border-zinc-200 bg-white shadow-xs transition focus-within:border-zinc-400 focus-within:ring-4 focus-within:ring-zinc-900/5">
          <span className="pl-3 text-sm text-zinc-400 select-none">/p/</span>
          <input
            id="slug"
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
            }}
            placeholder="tidewater"
            className="h-full w-full min-w-0 bg-transparent pr-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
            required
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </Field>
    </div>
  );
}
