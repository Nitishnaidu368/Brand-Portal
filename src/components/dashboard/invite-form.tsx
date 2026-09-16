"use client";

import { Check, Copy, KeyRound, Loader2, UserPlus } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef } from "react";
import { inviteUserAction } from "@/lib/actions/users";
import { Button } from "../ui/button";
import { Input } from "../ui/field";
import { useCopy } from "../use-copy";

function InviteLinkNotice({ email, url, reset }: { email: string; url: string; reset: boolean }) {
  const { copied, copy } = useCopy();
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
      <p className="text-sm text-emerald-900">
        {reset ? "Password reset link" : "Invite link"} for <strong className="font-medium">{email}</strong>. Send it
        to them directly — it works once and expires in 7 days.
      </p>
      <div className="mt-2 flex gap-2">
        <Input readOnly value={url} onFocus={(event) => event.currentTarget.select()} className="font-mono text-xs" />
        <Button variant="secondary" onClick={() => copy(url)}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

export function InviteForm({ portalId }: { portalId: string }) {
  const [state, dispatch, pending] = useActionState(inviteUserAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-3">
      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startTransition(() => dispatch(formData));
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input type="hidden" name="portalId" value={portalId} />
        <Input name="email" type="email" required placeholder="name@client.com" aria-label="Email" className="sm:flex-1" />
        <Input name="name" placeholder="Name (optional)" aria-label="Name" className="sm:w-44" />
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <UserPlus />}
          Create invite
        </Button>
      </form>
      {state && !state.ok && <p className="text-sm text-red-600">{state.message}</p>}
      {state?.ok && state.data?.inviteUrl && (
        <InviteLinkNotice email={state.data.email} url={state.data.inviteUrl} reset={false} />
      )}
    </div>
  );
}

export function ResetLinkButton({ portalId, email }: { portalId: string; email: string }) {
  const [state, dispatch, pending] = useActionState(inviteUserAction, null);
  return (
    <div className="contents">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          const formData = new FormData();
          formData.set("portalId", portalId);
          formData.set("email", email);
          startTransition(() => dispatch(formData));
        }}
      >
        {pending ? <Loader2 className="animate-spin" /> : <KeyRound />}
        New link
      </Button>
      {state?.ok && state.data?.inviteUrl && (
        <div className="basis-full">
          <InviteLinkNotice email={email} url={state.data.inviteUrl} reset />
        </div>
      )}
      {state && !state.ok && <p className="basis-full text-sm text-red-600">{state.message}</p>}
    </div>
  );
}
