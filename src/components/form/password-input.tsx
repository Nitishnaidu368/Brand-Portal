"use client";

import { Eye, EyeOff, WandSparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/field";

const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generatePassword(length = 14) {
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function PasswordInput({
  name,
  id,
  placeholder,
  autoComplete = "new-password",
  required,
  generate = false,
  autoFocus,
}: {
  name: string;
  id?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  generate?: boolean;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          autoFocus={autoFocus}
          className="pr-9"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-9 cursor-pointer items-center justify-center text-zinc-400 hover:text-zinc-700"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {generate && (
        <Button
          variant="secondary"
          onClick={() => {
            setValue(generatePassword());
            setVisible(true);
          }}
        >
          <WandSparkles />
          Generate
        </Button>
      )}
    </div>
  );
}
