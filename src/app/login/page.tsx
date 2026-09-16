import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthShell } from "@/components/brand";
import { PasswordInput } from "@/components/form/password-input";
import { ActionForm, FormMessage, SubmitButton } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/field";
import { loginAction } from "@/lib/actions/auth";
import { getCurrentAdmin, hasAnyAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  await connection();
  if (!(await hasAnyAdmin())) redirect("/setup");
  if (await getCurrentAdmin()) redirect("/dashboard");

  return (
    <AuthShell title="Sign in" subtitle="Manage your client brand portals.">
      <ActionForm action={loginAction} className="space-y-4">
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
        </Field>
        <Field label="Password" htmlFor="password">
          <PasswordInput id="password" name="password" autoComplete="current-password" required />
        </Field>
        <SubmitButton size="lg" className="w-full">
          Sign in
        </SubmitButton>
        <FormMessage />
      </ActionForm>
    </AuthShell>
  );
}
