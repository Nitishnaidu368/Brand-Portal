"use client";

import { KeyRound, Users } from "lucide-react";
import { useState } from "react";
import type { AccessMode } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { Field } from "../ui/field";
import { PasswordInput } from "./password-input";

const OPTIONS = [
  {
    value: "password",
    title: "Shared password",
    description: "One password for everyone at the client. Quickest to set up.",
    icon: KeyRound,
  },
  {
    value: "email",
    title: "Individual logins",
    description: "Invite people by email. Each person sets their own password.",
    icon: Users,
  },
] as const;

export function AccessModeFields({ defaultMode, hasPassword }: { defaultMode: AccessMode; hasPassword: boolean }) {
  const [mode, setMode] = useState<AccessMode>(defaultMode);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer gap-3 rounded-xl border p-4 transition",
              mode === option.value
                ? "border-zinc-900 bg-zinc-50/50 ring-4 ring-zinc-900/5"
                : "border-zinc-200 hover:border-zinc-300",
            )}
          >
            <input
              type="radio"
              name="accessMode"
              value={option.value}
              checked={mode === option.value}
              onChange={() => setMode(option.value)}
              className="mt-0.5 accent-zinc-900"
            />
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                <option.icon className="size-4" />
                {option.title}
              </div>
              <p className="mt-1 text-sm text-zinc-500">{option.description}</p>
            </div>
          </label>
        ))}
      </div>

      {mode === "password" && (
        <Field
          label={hasPassword ? "Change password" : "Portal password"}
          htmlFor="password"
          name="password"
          hint={
            hasPassword
              ? "Leave blank to keep the current password. Changing it signs everyone out."
              : "At least 8 characters. Send it to your client separately from the link."
          }
        >
          <PasswordInput id="password" name="password" generate required={!hasPassword} />
        </Field>
      )}
      {mode === "email" && (
        <p className="rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          After saving, invite people from the <strong className="font-medium text-zinc-900">Access</strong> tab. Each
          invite creates a private link where they choose a password.
        </p>
      )}
    </div>
  );
}
