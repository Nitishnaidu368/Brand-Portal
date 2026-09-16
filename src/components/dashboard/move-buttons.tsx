import { ArrowDown, ArrowUp } from "lucide-react";
import { moveItemAction } from "@/lib/actions/content";
import { ActionButton } from "../ui/action-button";

export function MoveButtons({
  kind,
  id,
  first,
  last,
}: {
  kind: "color" | "asset" | "font";
  id: string;
  first: boolean;
  last: boolean;
}) {
  return (
    <>
      <ActionButton
        action={moveItemAction}
        fields={{ kind, id, direction: "up" }}
        variant="ghost"
        size="icon"
        disabled={first}
        aria-label="Move up"
        title="Move up"
      >
        <ArrowUp />
      </ActionButton>
      <ActionButton
        action={moveItemAction}
        fields={{ kind, id, direction: "down" }}
        variant="ghost"
        size="icon"
        disabled={last}
        aria-label="Move down"
        title="Move down"
      >
        <ArrowDown />
      </ActionButton>
    </>
  );
}
