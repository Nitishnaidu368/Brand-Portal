import type { ZodError } from "zod";

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  data?: Record<string, string>;
} | null;

export type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function ok(message?: string, data?: Record<string, string>): ActionState {
  return { ok: true, message, data };
}

export function fail(message: string, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, message, fieldErrors };
}

export function zodFail(error: ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    fieldErrors[key] ??= issue.message;
  }
  return fail(Object.values(fieldErrors)[0] ?? "Please check the form and try again.", fieldErrors);
}

/** FormData → plain object of strings (files and repeated keys are ignored). */
export function formFields(formData: FormData) {
  const fields: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !(key in fields)) fields[key] = value;
  }
  return fields;
}
