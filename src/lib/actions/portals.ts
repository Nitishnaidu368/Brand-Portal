"use server";

import { and, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, formFields, ok, zodFail, type ActionState } from "@/lib/action-state";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { serializeBlockData } from "@/lib/blocks";
import { runBatch } from "@/lib/data/portals";
import { db } from "@/lib/db";
import { ACCESS_MODES, blocks, fonts, pages, portals, sessions } from "@/lib/db/schema";
import { deleteFileById } from "@/lib/files";
import { deletePrefix } from "@/lib/storage";
import { guideTemplate, type TemplatePage } from "@/lib/templates";
import { newId } from "@/lib/utils";
import { authorizePortal, DENIED, hexSchema, refreshAll, slugSchema } from "./guards";

const RESERVED_SLUGS = new Set(["login", "setup", "dashboard", "editor", "api", "admin"]);

async function slugTaken(slug: string, exceptPortalId?: string) {
  const row = await db.query.portals.findFirst({
    where: exceptPortalId ? and(eq(portals.slug, slug), ne(portals.id, exceptPortalId)) : eq(portals.slug, slug),
  });
  return Boolean(row) || RESERVED_SLUGS.has(slug);
}

const detailsSchema = z.object({
  clientName: z.string().trim().min(1, "Enter the client's name").max(80),
  slug: slugSchema,
  tagline: z.string().trim().max(140, "Keep the tagline under 140 characters").default(""),
  accentColor: hexSchema,
});

const createSchema = detailsSchema
  .extend({
    accessMode: z.enum(ACCESS_MODES),
    password: z.string().max(200).default(""),
    start: z.enum(["template", "blank"]).default("template"),
  })
  .superRefine((value, ctx) => {
    if (value.accessMode === "password" && value.password.length < MIN_PASSWORD_LENGTH) {
      ctx.addIssue({ code: "custom", path: ["password"], message: `Use at least ${MIN_PASSWORD_LENGTH} characters` });
    }
  });

const BLANK_GUIDE: TemplatePage[] = [{ slug: "introduction", title: "Introduction", blocks: [{ type: "text" }] }];

export async function createPortalAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await getCurrentAdmin();
  if (!admin) return DENIED;

  const parsed = createSchema.safeParse(formFields(formData));
  if (!parsed.success) return zodFail(parsed.error);
  const values = parsed.data;
  if (await slugTaken(values.slug)) return fail("That portal URL is taken.", { slug: "That URL is taken" });

  const portalId = newId();
  const guide = values.start === "template" ? guideTemplate() : BLANK_GUIDE;
  await runBatch([
    db.insert(portals).values({
      id: portalId,
      agencyId: admin.agencyId,
      clientName: values.clientName,
      slug: values.slug,
      tagline: values.tagline,
      accentColor: values.accentColor,
      guideTitle: `${values.clientName} Visual Identity\nBrand Guidelines ${new Date().getFullYear()}`,
      accessMode: values.accessMode,
      passwordHash: values.accessMode === "password" ? await hashPassword(values.password) : null,
    }),
    ...guide.flatMap((page, pagePosition) => {
      const pageId = newId();
      return [
        db.insert(pages).values({
          id: pageId,
          portalId,
          slug: page.slug,
          title: page.title,
          buttonLabel: page.buttonLabel ?? "",
          position: pagePosition,
        }),
        ...page.blocks.flatMap((block, position) => {
          const blockId = newId();
          return [
            db.insert(blocks).values({
              id: blockId,
              portalId,
              pageId,
              type: block.type,
              data: serializeBlockData(block.type, block.data ?? {}),
              position,
            }),
            ...(block.fonts ?? []).map((font, fontPosition) => db.insert(fonts).values({
              id: newId(),
              portalId,
              blockId,
              source: "google" as const,
              family: font.family,
              weights: font.weights,
              usage: font.usage,
              position: fontPosition,
            })),
          ];
        }),
      ];
    }),
  ]);
  refreshAll();
  redirect(`/dashboard/portals/${portalId}`);
}

const settingsSchema = detailsSchema.extend({
  guideTitle: z.string().trim().max(160, "Keep the guideline title under 160 characters").default(""),
  versionLabel: z.string().trim().max(40).default(""),
  footerLabel: z.string().trim().max(80).default(""),
});

export async function updatePortalSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizePortal(fields.portalId);
  if (!auth) return DENIED;

  const parsed = settingsSchema.safeParse(fields);
  if (!parsed.success) return zodFail(parsed.error);
  if (await slugTaken(parsed.data.slug, auth.portal.id)) {
    return fail("That portal URL is taken.", { slug: "That URL is taken" });
  }

  await db
    .update(portals)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(portals.id, auth.portal.id));
  refreshAll();
  return ok("Settings saved");
}

export async function setPublishedAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizePortal(fields.portalId);
  if (!auth) return DENIED;
  const publish = fields.published === "1";

  if (publish && auth.portal.accessMode === "password" && !auth.portal.passwordHash) {
    return fail("Set a portal password on the Access tab before publishing.");
  }
  await db.update(portals).set({ isPublished: publish, updatedAt: new Date() }).where(eq(portals.id, auth.portal.id));
  refreshAll();
  return ok(publish ? "Portal published" : "Portal unpublished");
}

const accessSchema = z.object({
  accessMode: z.enum(ACCESS_MODES),
  password: z.string().max(200).default(""),
});

export async function updateAccessAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizePortal(fields.portalId);
  if (!auth) return DENIED;

  const parsed = accessSchema.safeParse(fields);
  if (!parsed.success) return zodFail(parsed.error);
  const { accessMode, password } = parsed.data;
  const { portal } = auth;

  let passwordHash = portal.passwordHash;
  if (accessMode === "password") {
    if (password) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        return fail(`Use at least ${MIN_PASSWORD_LENGTH} characters.`, {
          password: `Use at least ${MIN_PASSWORD_LENGTH} characters`,
        });
      }
      passwordHash = await hashPassword(password);
    } else if (!passwordHash) {
      return fail("Set a password for this portal.", { password: "Set a password" });
    }
  }

  const modeChanged = accessMode !== portal.accessMode;
  const passwordChanged = passwordHash !== portal.passwordHash;
  await db.transaction(async (tx) => {
    await tx.update(portals).set({ accessMode, passwordHash, updatedAt: new Date() }).where(eq(portals.id, portal.id));
    if (modeChanged || passwordChanged) {
      await tx.delete(sessions).where(and(eq(sessions.kind, "portal"), eq(sessions.portalId, portal.id)));
    }
  });

  refreshAll();
  if (passwordChanged && !modeChanged) return ok("Password updated. Clients will need the new password to sign in.");
  return ok("Access settings saved");
}

const PORTAL_IMAGES = {
  logo: "logoFileId",
  cover: "coverFileId",
  wordmark: "wordmarkFileId",
} as const;

export async function removePortalImageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizePortal(fields.portalId);
  if (!auth) return DENIED;
  if (!Object.hasOwn(PORTAL_IMAGES, fields.kind)) return fail("Unknown image.");
  const column = PORTAL_IMAGES[fields.kind as keyof typeof PORTAL_IMAGES];

  await db
    .update(portals)
    .set({ [column]: null, updatedAt: new Date() })
    .where(eq(portals.id, auth.portal.id));
  await deleteFileById(auth.portal[column]);
  refreshAll();
  return ok();
}

export async function deletePortalAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = formFields(formData);
  const auth = await authorizePortal(fields.portalId);
  if (!auth) return DENIED;
  if (fields.confirm?.trim() !== auth.portal.slug) {
    return fail(`Type "${auth.portal.slug}" to confirm.`, { confirm: "Doesn't match the portal URL" });
  }

  // Rows cascade from the portal; uploaded files live on disk under the portal's prefix.
  await db.delete(portals).where(eq(portals.id, auth.portal.id));
  await deletePrefix(`portals/${auth.portal.id}`);
  refreshAll();
  redirect("/dashboard");
}
