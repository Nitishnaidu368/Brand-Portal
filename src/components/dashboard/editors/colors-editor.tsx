import { Palette, Plus, Trash2 } from "lucide-react";
import { addColorAction, deleteColorAction, updateColorAction } from "@/lib/actions/content";
import type { Color } from "@/lib/db/schema";
import type { GuideBlock } from "@/lib/guide";
import { ColorInput } from "../../form/color-input";
import { ActionButton } from "../../ui/action-button";
import { ActionForm, FormMessage, SubmitButton } from "../../ui/action-form";
import { Card, CardBody, CardHeader, EmptyState } from "../../ui/card";
import { Field, Input } from "../../ui/field";
import { MoveButtons } from "../move-buttons";

function ColorFields({ color, idPrefix }: { color?: Color; idPrefix: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Name" htmlFor={`${idPrefix}-name`} name="name">
        <Input id={`${idPrefix}-name`} name="name" defaultValue={color?.name} placeholder="Deep Sea" required />
      </Field>
      <Field label="HEX" htmlFor={`${idPrefix}-hex`} name="hex">
        <ColorInput id={`${idPrefix}-hex`} name="hex" defaultValue={color?.hex ?? ""} />
      </Field>
      <Field label="CMYK (optional)" htmlFor={`${idPrefix}-cmyk`} name="cmyk">
        <Input id={`${idPrefix}-cmyk`} name="cmyk" defaultValue={color?.cmyk ?? ""} placeholder="Auto-calculated" />
      </Field>
      <Field label="Pantone (optional)" htmlFor={`${idPrefix}-pantone`} name="pantone">
        <Input id={`${idPrefix}-pantone`} name="pantone" defaultValue={color?.pantone ?? ""} placeholder="3035 C" />
      </Field>
      <Field label="Usage note (optional)" htmlFor={`${idPrefix}-usage`} name="usage" className="col-span-2">
        <Input id={`${idPrefix}-usage`} name="usage" defaultValue={color?.usage ?? ""} placeholder="Headlines and buttons" />
      </Field>
    </div>
  );
}

export function ColorsEditor({ block }: { block: GuideBlock }) {
  const count = block.colors.length;
  return (
    <>
      <Card>
        <CardHeader
          title="Colors"
          description={count ? `${count} ${count === 1 ? "color" : "colors"}. RGB and CMYK are worked out from the HEX value.` : undefined}
        />
        {count === 0 ? (
          <EmptyState icon={<Palette className="size-5" />} title="No colors yet">
            Add the first color below.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {block.colors.map((color, index) => (
              <li key={`${color.id}:${color.name}:${color.hex}:${color.cmyk}:${color.pantone}:${color.usage}`} className="px-4 py-4">
                <ActionForm action={updateColorAction} className="space-y-3">
                  <input type="hidden" name="colorId" value={color.id} />
                  <ColorFields color={color} idPrefix={color.id} />
                  <div className="flex flex-wrap items-center gap-2">
                    <SubmitButton variant="secondary" size="sm">
                      Save
                    </SubmitButton>
                    <FormMessage />
                    <div className="ml-auto flex items-center gap-0.5">
                      <MoveButtons kind="color" id={color.id} first={index === 0} last={index === count - 1} />
                      <ActionButton
                        action={deleteColorAction}
                        fields={{ colorId: color.id }}
                        confirm={`Delete ${color.name}?`}
                        variant="dangerGhost"
                        size="icon"
                        aria-label={`Delete ${color.name}`}
                        title="Delete"
                      >
                        <Trash2 />
                      </ActionButton>
                    </div>
                  </div>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Add a color" />
        <CardBody>
          <ActionForm key={count} action={addColorAction} className="space-y-3">
            <input type="hidden" name="blockId" value={block.id} />
            <ColorFields idPrefix={`${block.id}-new`} />
            <div className="flex items-center gap-3">
              <SubmitButton size="sm">
                <Plus />
                Add color
              </SubmitButton>
              <FormMessage />
            </div>
          </ActionForm>
        </CardBody>
      </Card>
    </>
  );
}
