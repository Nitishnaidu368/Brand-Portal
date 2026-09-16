"use client";

import { startTransition, useActionState, useEffect } from "react";
import type { FormAction } from "@/lib/action-state";
import { Button, type ButtonProps } from "./button";

/** A single button that runs a server action with the given fields, optionally after a confirm prompt. */
export function ActionButton({
  action,
  fields,
  confirm,
  disabled,
  children,
  ...props
}: Omit<ButtonProps, "onClick" | "type"> & {
  action: FormAction;
  fields: Record<string, string>;
  confirm?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, null);

  useEffect(() => {
    if (state && !state.ok && state.message) window.alert(state.message);
  }, [state]);

  return (
    <Button
      {...props}
      disabled={pending || disabled}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        const formData = new FormData();
        for (const [key, value] of Object.entries(fields)) formData.set(key, value);
        startTransition(() => dispatch(formData));
      }}
    >
      {children}
    </Button>
  );
}
