import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { addListItemAction, moveListItemAction, removeListItemAction, updateListItemAction } from "@/lib/actions/guide";
import { contrastRating } from "@/lib/blocks";
import { contrastRatio } from "@/lib/color";
import { weightName } from "@/lib/fonts";
import type { GuideBlock } from "@/lib/guide";
import { ColorInput } from "../form/color-input";
import { ActionButton } from "../ui/action-button";
import { ActionForm, FormMessage, SubmitButton } from "../ui/action-form";
import { Card, CardHeader, EmptyState } from "../ui/card";
import { Field, Input, Select, Textarea } from "../ui/field";

type ListBlock = Extract<GuideBlock, { type: "cards" | "pairings" | "typescale" }>;

const COPY = {
  cards: { title: "Cards", one: "card", add: "Add card" },
  pairings: { title: "Pairings", one: "pairing", add: "Add pairing" },
  typescale: { title: "Type styles", one: "style", add: "Add style" },
};

const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

function ItemForm({ block, index, count, children }: { block: ListBlock; index: number; count: number; children: ReactNode }) {
  const fields = { blockId: block.id, index: String(index) };
  return (
    <li className="px-4 py-4">
      <ActionForm action={updateListItemAction} className="space-y-3">
        <input type="hidden" name="blockId" value={block.id} />
        <input type="hidden" name="index" value={index} />
        {children}
        <div className="flex flex-wrap items-center gap-2">
          <SubmitButton variant="secondary" size="sm">
            Save
          </SubmitButton>
          <FormMessage />
          <div className="ml-auto flex items-center gap-0.5">
            <ActionButton
              action={moveListItemAction}
              fields={{ ...fields, direction: "up" }}
              variant="ghost"
              size="icon"
              disabled={index === 0}
              aria-label="Move up"
              title="Move up"
            >
              <ArrowUp />
            </ActionButton>
            <ActionButton
              action={moveListItemAction}
              fields={{ ...fields, direction: "down" }}
              variant="ghost"
              size="icon"
              disabled={index === count - 1}
              aria-label="Move down"
              title="Move down"
            >
              <ArrowDown />
            </ActionButton>
            <ActionButton
              action={removeListItemAction}
              fields={fields}
              confirm={`Remove this ${COPY[block.type].one}?`}
              variant="dangerGhost"
              size="icon"
              aria-label="Remove"
              title="Remove"
            >
              <Trash2 />
            </ActionButton>
          </div>
        </div>
      </ActionForm>
    </li>
  );
}

function ItemFields({ block, index }: { block: ListBlock; index: number }) {
  const id = (name: string) => `${block.id}-${index}-${name}`;

  if (block.type === "cards") {
    const item = block.data.items[index];
    return (
      <>
        <Field label="Title" htmlFor={id("title")} name="title">
          <Input id={id("title")} name="title" defaultValue={item.title} />
        </Field>
        <Field label="Text" htmlFor={id("body")} name="body">
          <Textarea id={id("body")} name="body" defaultValue={item.body} rows={3} />
        </Field>
      </>
    );
  }

  if (block.type === "pairings") {
    const item = block.data.items[index];
    const ratio = contrastRatio(item.background, item.foreground);
    return (
      <div className="grid grid-cols-2 gap-3">
        <Field label="Background" htmlFor={id("background")} name="background">
          <ColorInput id={id("background")} name="background" defaultValue={item.background} />
        </Field>
        <Field label="Foreground" htmlFor={id("foreground")} name="foreground">
          <ColorInput id={id("foreground")} name="foreground" defaultValue={item.foreground} />
        </Field>
        <p className="col-span-2 text-xs text-zinc-500">
          Contrast {ratio.toFixed(2)}:1 · {contrastRating(ratio)}
        </p>
      </div>
    );
  }

  const item = block.data.items[index];
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Sample text" htmlFor={id("text")} name="text" className="col-span-2">
        <Input id={id("text")} name="text" defaultValue={item.text} />
      </Field>
      <Field label="Style name" htmlFor={id("label")} name="label">
        <Input id={id("label")} name="label" defaultValue={item.label} placeholder="Display" />
      </Field>
      <Field label="Size (px)" htmlFor={id("size")} name="size">
        <Input id={id("size")} name="size" type="number" min={10} max={200} defaultValue={item.size} />
      </Field>
      <Field label="Weight" htmlFor={id("weight")} name="weight" className="col-span-2">
        <Select id={id("weight")} name="weight" defaultValue={String(item.weight)}>
          {WEIGHTS.map((weight) => (
            <option key={weight} value={weight}>
              {weight} · {weightName(weight)}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

/** Editor for the lists kept in block data: text grid cards, color pairings and type scale rows. */
export function ListItemsEditor({ block }: { block: ListBlock }) {
  const items: unknown[] = block.data.items;
  const copy = COPY[block.type];

  return (
    <Card>
      <CardHeader
        title={copy.title}
        description={block.type === "pairings" ? "AA and AAA ratings are worked out for you." : "You can also edit the text right on the page."}
        actions={
          <ActionButton action={addListItemAction} fields={{ blockId: block.id }} variant="secondary" size="sm">
            <Plus />
            {copy.add}
          </ActionButton>
        }
      />
      {items.length === 0 ? (
        <EmptyState title={`No ${copy.title.toLowerCase()} yet`} />
      ) : (
        <ul className="divide-y divide-zinc-100">
          {items.map((item, index) => (
            <ItemForm key={`${index}:${JSON.stringify(item)}`} block={block} index={index} count={items.length}>
              <ItemFields block={block} index={index} />
            </ItemForm>
          ))}
        </ul>
      )}
    </Card>
  );
}
