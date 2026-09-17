import { updateBlockSettingsAction } from "@/lib/actions/guide";
import { ASPECTS, BLOCK_META, TILE_BACKGROUNDS } from "@/lib/blocks";
import type { GuideBlock, GuideFont } from "@/lib/guide";
import { AssetsEditor } from "../dashboard/editors/assets-editor";
import { ColorsEditor } from "../dashboard/editors/colors-editor";
import { FontsEditor } from "../dashboard/editors/fonts-editor";
import { ActionForm, FormMessage, SubmitButton } from "../ui/action-form";
import { Card, CardBody, CardHeader } from "../ui/card";
import { Field, Input, Select } from "../ui/field";
import { ListItemsEditor } from "./list-items-editor";

type Options = [value: string, label: string][];

const ASPECT_LABELS: Record<(typeof ASPECTS)[number], string> = {
  auto: "Original shape",
  "16/9": "Wide (16:9)",
  "3/2": "Landscape (3:2)",
  "4/3": "Classic (4:3)",
  "1/1": "Square",
  "3/4": "Portrait (3:4)",
};

const BACKGROUND_LABELS: Record<(typeof TILE_BACKGROUNDS)[number], string> = {
  none: "None",
  grey: "Light grey",
  white: "White",
  dark: "Black",
};

const range = (from: number, to: number): Options =>
  Array.from({ length: to - from + 1 }, (_, i) => [String(from + i), String(from + i)]);

function Choice({ id, name, label, value, options }: { id: string; name: string; label: string; value: string; options: Options }) {
  return (
    <Field label={label} htmlFor={id} name={name}>
      <Select id={id} name={name} defaultValue={value}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function Toggle({ name, label, hint, checked }: { name: string; label: string; hint?: string; checked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input type="checkbox" name={name} defaultChecked={checked} className="mt-0.5 accent-zinc-900" />
      <span className="text-sm">
        <span className="block font-medium text-zinc-900">{label}</span>
        {hint && <span className="block text-[13px] text-zinc-500">{hint}</span>}
      </span>
    </label>
  );
}

function LayoutFields({ block }: { block: GuideBlock }) {
  const id = (name: string) => `${block.id}-${name}`;
  switch (block.type) {
    case "cards":
      return <Choice id={id("columns")} name="columns" label="Columns" value={String(block.data.columns)} options={range(1, 4)} />;
    case "media":
      return (
        <>
          <Choice id={id("columns")} name="columns" label="Columns" value={String(block.data.columns)} options={range(1, 4)} />
          <Choice
            id={id("background")}
            name="background"
            label="Tile background"
            value={block.data.background}
            options={TILE_BACKGROUNDS.map((value) => [value, BACKGROUND_LABELS[value]])}
          />
          <Choice
            id={id("aspect")}
            name="aspect"
            label="Tile shape"
            value={block.data.aspect}
            options={ASPECTS.map((value) => [value, ASPECT_LABELS[value]])}
          />
          <Choice
            id={id("fit")}
            name="fit"
            label="Image fit"
            value={block.data.fit}
            options={[
              ["contain", "Fit inside"],
              ["cover", "Fill and crop"],
            ]}
          />
        </>
      );
    case "colors":
      return (
        <>
          <Choice
            id={id("columns")}
            name="columns"
            label="Swatches per row"
            value={String(block.data.columns)}
            options={[["0", "All in one row"], ...range(2, 6)]}
          />
          <Choice
            id={id("height")}
            name="height"
            label="Swatch height"
            value={block.data.height}
            options={[
              ["tall", "Tall"],
              ["short", "Short"],
            ]}
          />
        </>
      );
    case "pairings":
      return <Choice id={id("columns")} name="columns" label="Columns" value={String(block.data.columns)} options={range(2, 6)} />;
    case "typescale":
      return (
        <>
          <Field label="Google Font" htmlFor={id("font")} name="font" hint="Empty uses Inter.">
            <Input id={id("font")} name="font" defaultValue={block.data.font} placeholder="Inter" />
          </Field>
          <Choice
            id={id("background")}
            name="background"
            label="Panel"
            value={block.data.background}
            options={[
              ["dark", "Black"],
              ["light", "Light grey"],
            ]}
          />
        </>
      );
    default:
      return null;
  }
}

function LayoutToggles({ block }: { block: GuideBlock }) {
  switch (block.type) {
    case "media":
      return (
        <>
          <Toggle name="band" label="Grey band behind the images" checked={block.data.band} />
          <Toggle
            name="downloadable"
            label="Download buttons"
            hint="Clients can download each file. SVGs also come as PNG, JPG and WEBP."
            checked={block.data.downloadable}
          />
        </>
      );
    case "colors":
      return (
        <Toggle
          name="exportable"
          label="Palette download"
          hint="CSS, SCSS, Tailwind, design tokens and Adobe swatches."
          checked={block.data.exportable}
        />
      );
    case "typeface":
      return (
        <>
          <Toggle name="characters" label="Character sets" hint="A–Z, a–z, numbers and symbols for each weight." checked={block.data.characters} />
          <Toggle name="tester" label="Type tester" hint="Clients type their own text to preview each font." checked={block.data.tester} />
        </>
      );
    default:
      return null;
  }
}

export function BlockSettings({ block, fontOptions = [] }: { block: GuideBlock; fontOptions?: GuideFont[] }) {
  const items = BLOCK_META[block.type].items;

  return (
    <>
      <Card>
        <CardHeader title="Layout" description="Text is edited right on the page: click it." />
        <CardBody>
          <ActionForm key={block.id} action={updateBlockSettingsAction} className="space-y-4">
            <input type="hidden" name="blockId" value={block.id} />
            <div className="grid grid-cols-2 gap-3">
              <Choice
                id={`${block.id}-size`}
                name="size"
                label="Text size"
                value={block.data.size}
                options={[
                  ["sm", "Small (14px)"],
                  ["lg", "Large (20px)"],
                ]}
              />
              <LayoutFields block={block} />
            </div>
            <div className="space-y-3">
              <Toggle name="divider" label="Line above the block" checked={block.data.divider} />
              <LayoutToggles block={block} />
            </div>
            <div className="flex items-center gap-3">
              <SubmitButton variant="secondary" size="sm">
                Save layout
              </SubmitButton>
              <FormMessage />
            </div>
          </ActionForm>
        </CardBody>
      </Card>

      {block.type === "colors" && <ColorsEditor block={block} />}
      {block.type === "typeface" && <FontsEditor block={block} />}
      {items === "assets" && <AssetsEditor block={block} />}
      {(block.type === "cards" || block.type === "pairings" || block.type === "typescale") && (
        <ListItemsEditor block={block} fontOptions={fontOptions} />
      )}
    </>
  );
}
