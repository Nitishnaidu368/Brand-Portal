import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthShell } from "@/components/brand";
import { PasswordInput } from "@/components/form/password-input";
import { ActionForm, FormMessage, SubmitButton } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/field";
import { setupAction } from "@/lib/actions/auth";
import { hasAnyAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Set up" };

export default async function SetupPage() {
  // Whether setup is still needed depends on the live database, never on build-time state.
  await connection();
  if (await hasAnyAdmin()) redirect("/login");

  return (
    <AuthShell title="Set up your studio" subtitle="Create the admin account you'll use to build client portals.">
      <ActionForm action={setupAction} className="space-y-4">
        <Field label="Studio or agency name" htmlFor="agencyName" name="agencyName">
          <Input id="agencyName" name="agencyName" placeholder="Northstar Studio" required autoFocus />
        </Field>
        <Field label="Your name" htmlFor="name" name="name">
          <Input id="name" name="name" autoComplete="name" required />
        </Field>
        <Field label="Email" htmlFor="email" name="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="password" name="password" hint="At least 8 characters.">
          <PasswordInput id="password" name="password" required />
        </Field>
        <SubmitButton size="lg" className="w-full">
          Create account
        </SubmitButton>
        <FormMessage />
      </ActionForm>
    </AuthShell>
  );
}
