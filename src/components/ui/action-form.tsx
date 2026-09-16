"use client";

import { Check, Loader2 } from "lucide-react";
import {
  createContext,
  startTransition,
  useActionState,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ActionState, FormAction } from "@/lib/action-state";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "./button";

const FormContext = createContext<{ state: ActionState; pending: boolean }>({ state: null, pending: false });

/**
 * A form bound to a server action with inline pending/success/error feedback.
 * Submits via a transition instead of the `action` prop so React doesn't reset
 * the fields (and wipe the user's input) when validation fails.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  id,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  id?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <FormContext.Provider value={{ state, pending }}>
      <form
        id={id}
        ref={formRef}
        className={className}
        onSubmit={(event) => {
          event.preventDefault();
          const submitter = (event.nativeEvent as SubmitEvent).submitter;
          const formData = new FormData(event.currentTarget, submitter);
          startTransition(() => dispatch(formData));
        }}
      >
        {children}
      </form>
    </FormContext.Provider>
  );
}

export function useActionFormState() {
  return useContext(FormContext);
}

export function SubmitButton({ children, disabled, ...props }: ButtonProps) {
  const { pending } = useContext(FormContext);
  return (
    <Button type="submit" {...props} disabled={pending || disabled}>
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}

export function FormMessage({ className }: { className?: string }) {
  const { state } = useContext(FormContext);
  const [dismissed, setDismissed] = useState<ActionState>(null);

  useEffect(() => {
    if (!state?.ok || !state.message) return;
    const timer = setTimeout(() => setDismissed(state), 2500);
    return () => clearTimeout(timer);
  }, [state]);

  if (!state?.message || dismissed === state) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={cn("flex items-center gap-1.5 text-sm", state.ok ? "text-emerald-600" : "text-red-600", className)}
    >
      {state.ok && <Check className="size-4" />}
      {state.message}
    </p>
  );
}

export function FieldError({ name }: { name: string }) {
  const { state } = useContext(FormContext);
  const error = state?.fieldErrors?.[name];
  return error ? <p className="text-xs text-red-600">{error}</p> : null;
}
