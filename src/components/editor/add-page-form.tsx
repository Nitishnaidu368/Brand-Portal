import { Plus } from "lucide-react";
import { addPageAction } from "@/lib/actions/guide";
import { ActionForm, FormMessage, SubmitButton } from "../ui/action-form";

export function AddPageForm({ portalId }: { portalId: string }) {
  return (
    <ActionForm action={addPageAction} className="font-sans">
      <input type="hidden" name="portalId" value={portalId} />
      <div className="flex items-center gap-1.5">
        <input
          name="title"
          required
          maxLength={60}
          placeholder="New page title"
          aria-label="New page title"
          className="h-8 min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-2 text-[13px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400"
        />
        <SubmitButton variant="secondary" size="icon" aria-label="Add page" title="Add page">
          <Plus />
        </SubmitButton>
      </div>
      <FormMessage className="mt-1.5 text-xs" />
    </ActionForm>
  );
}
