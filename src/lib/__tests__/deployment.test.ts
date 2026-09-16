import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  return { cookies: new Map<string, string>(), objects: new Map<string, Buffer>() };
});
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => state.cookies.has(name) ? { value: state.cookies.get(name)! } : undefined,
    set: (name: string, value: string) => state.cookies.set(name, value),
    delete: (name: string) => state.cookies.delete(name),
  }),
  headers: async () => new Headers({ host: "localhost", "x-forwarded-for": "deployment-test" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); },
  notFound: () => { throw new Error("NOT_FOUND"); },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// Exercise real file processing and database writes with an in-memory object store.
vi.mock("@/lib/storage", () => ({
  putObject: async (key: string, bytes: Uint8Array) => { state.objects.set(key, Buffer.from(bytes)); },
  getObject: async (key: string) => {
    const bytes = state.objects.get(key);
    if (!bytes) throw new Error("Object missing");
    return bytes;
  },
  objectExists: async (key: string) => state.objects.has(key),
  deleteObject: async (key: string) => { state.objects.delete(key); },
  deletePrefix: async (prefix: string) => {
    for (const key of state.objects.keys()) if (key.startsWith(prefix + "/")) state.objects.delete(key);
  },
  signedObjectUrl: async (key: string, filename?: string) => `https://storage.example/${key}?expires=60${filename ? `&download=${filename}` : ""}`,
  storageBucket: () => ({
    createSignedUploadUrl: async (key: string) => ({ data: { signedUrl: `https://storage.example/upload/${key}` }, error: null }),
    info: async (key: string) => ({ data: { size: state.objects.get(key)?.byteLength }, error: null }),
  }),
}));

import { db, sqlClient } from "../db";
import { admins, agencies, blocks, files, loginAttempts, pages, pendingUploads, portalUsers, portals, sessions } from "../db/schema";
import { setupAction } from "../actions/auth";
import { createPortalAction, updateAccessAction } from "../actions/portals";
import { acceptInviteAction, portalPasswordLoginAction } from "../actions/portal-access";
import { createSession } from "../auth/session";
import { portalCookieName } from "../auth/portal";
import { sha256, verifyPassword, verifySetupSecret } from "../auth/password";
import { recordFailedAttempt } from "../auth/rate-limit";
import { getRecentDownloads, listPortals, runBatch } from "../data/portals";
import { cleanupExpiredUploads } from "../uploads";
import { POST as upload } from "@/app/api/admin/upload/route";
import { GET as fileGet } from "@/app/api/files/[fileId]/route";
import { GET as zipGet } from "@/app/api/portals/[portalId]/zip/route";

const form = (values: Record<string, string>) => {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, value);
  return result;
};
const request = (body: object, origin = "http://localhost") => new NextRequest("http://localhost/api/admin/upload", {
  method: "POST", headers: { "Content-Type": "application/json", origin, host: "localhost" }, body: JSON.stringify(body),
});
const download = (id: string) => fileGet(new NextRequest(`http://localhost/api/files/${id}?download=1`), { params: Promise.resolve({ fileId: id }) });

it("requires a configured setup secret of at least 32 characters", () => {
  vi.stubEnv("SETUP_SECRET", "");
  expect(verifySetupSecret("")).toBe(false);
  vi.stubEnv("SETUP_SECRET", "too-short");
  expect(verifySetupSecret("too-short")).toBe(false);
  vi.stubEnv("SETUP_SECRET", "s".repeat(32));
  expect(verifySetupSecret("s".repeat(32))).toBe(true);
  expect(verifySetupSecret("wrong")).toBe(false);
  vi.unstubAllEnvs();
});

describe.skipIf(!process.env.TEST_DATABASE_URL)("Postgres deployment flows (isolated brand_portal_test database)", () => {
  let agencyId: string;
  let adminCookie: string;
  let portalId: string;
  let pageId: string;
  let blockId: string;
  let fileId: string;

  beforeAll(async () => {
    if (new URL(process.env.TEST_DATABASE_URL!).pathname !== "/brand_portal_test") {
      throw new Error("TEST_DATABASE_URL must target an isolated database named brand_portal_test.");
    }
    if ((await db.select().from(admins)).length) throw new Error("Use an empty migrated test database.");
    vi.stubEnv("SETUP_SECRET", "s".repeat(32));
  });
  afterAll(async () => {
    if (agencyId) {
      const owned = await db.select({ id: portals.id }).from(portals).where(eq(portals.agencyId, agencyId));
      for (const portal of owned) await db.delete(pendingUploads).where(eq(pendingUploads.portalId, portal.id));
      await db.delete(agencies).where(eq(agencies.id, agencyId));
    }
    await db.delete(loginAttempts).where(eq(loginAttempts.key, "deployment-test"));
    await sqlClient.end();
    state.objects.clear();
    vi.unstubAllEnvs();
  });

  it("requires the setup secret and creates only one admin under concurrent setup", async () => {
    const values = { agencyName: "Test", name: "Owner", email: "owner@example.test", password: "private-password", setupSecret: "wrong" };
    expect((await setupAction(null, form(values)))?.ok).toBe(false);
    const attempts = await Promise.allSettled([1, 2].map(() => setupAction(null, form({ ...values, setupSecret: "s".repeat(32) }))));
    expect(attempts.filter((result) => result.status === "rejected")).toHaveLength(1); // successful action redirects
    const rows = await db.select().from(admins);
    expect(rows).toHaveLength(1);
    agencyId = rows[0].agencyId;
    adminCookie = state.cookies.get("bp_admin")!;
    expect(adminCookie).toBeTruthy();
  });

  it("creates a guide atomically and rolls back failed batches", async () => {
    await expect(createPortalAction(null, form({ clientName: "Test client", slug: "test-client", accentColor: "#112233", accessMode: "password", password: "portal-password", start: "blank" }))).rejects.toThrow("REDIRECT:");
    const portal = await db.query.portals.findFirst({ where: eq(portals.slug, "test-client") });
    portalId = portal!.id;
    const page = await db.query.pages.findFirst({ where: eq(pages.portalId, portalId) });
    pageId = page!.id;
    blockId = crypto.randomUUID();
    await db.insert(blocks).values({ id: blockId, portalId, pageId, type: "files" });
    const id = crypto.randomUUID();
    await expect(runBatch([
      db.insert(pages).values({ id, portalId, slug: "rollback", title: "Rollback" }),
      db.insert(pages).values({ id, portalId, slug: "rollback-2", title: "Duplicate id" }),
    ])).rejects.toThrow();
    expect(await db.query.pages.findFirst({ where: eq(pages.id, id) })).toBeUndefined();
    const rls = await db.execute(sql`select relrowsecurity from pg_class where oid = 'public.files'::regclass`);
    expect(rls[0].relrowsecurity).toBe(true);
  });

  it("loads the dashboard portal and activity queries for the signed-in agency", async () => {
    const listed = await listPortals(agencyId);
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ id: portalId, pageCount: 1, assetCount: 0, colorCount: 0, downloads30d: 0 });
    expect(await getRecentDownloads(agencyId)).toEqual([]);
  });

  it("rejects cross-origin, oversized, unsupported and foreign-target uploads", async () => {
    const body = { action: "init", purpose: "asset", portalId, blockId, name: "kit.zip", size: 10 };
    expect((await upload(request(body, "not-a-url"))).status).toBe(403);
    expect((await upload(request(body, "https://other.example"))).status).toBe(403);
    expect((await upload(request({ ...body, size: 51 * 1024 * 1024 }))).status).toBe(400);
    expect((await upload(request({ ...body, name: "script.html" }))).status).toBe(400);
    expect((await upload(request({ ...body, portalId: crypto.randomUUID() }))).status).toBe(404);
    state.cookies.clear();
    expect((await upload(request(body))).status).toBe(401);
    state.cookies.set("bp_admin", adminCookie);
    const started = await upload(request(body));
    const { uploadId } = await started.json();
    const otherAgency = crypto.randomUUID();
    const otherAdmin = crypto.randomUUID();
    await db.insert(agencies).values({ id: otherAgency, name: "Other owner" });
    await db.insert(admins).values({ id: otherAdmin, agencyId: otherAgency, email: "other-owner@example.test", name: "Other", passwordHash: "unused" });
    const otherSession = await createSession({ kind: "admin", adminId: otherAdmin }, 1);
    state.cookies.set("bp_admin", otherSession.token);
    expect((await upload(request(body))).status).toBe(404);
    expect((await upload(request({ action: "complete", uploadId }))).status).toBe(409);
    state.cookies.set("bp_admin", adminCookie);
    await db.delete(agencies).where(eq(agencies.id, otherAgency));
  });

  it("accepts a 49 MiB prepared ZIP once and keeps staging objects private", async () => {
    const bytes = Buffer.alloc(49 * 1024 * 1024);
    bytes.set([80, 75, 3, 4]);
    const started = await upload(request({ action: "init", purpose: "asset", portalId, blockId, name: "brand-kit.zip", size: bytes.length }));
    expect(started.status).toBe(200);
    const { uploadId } = await started.json();
    const pending = await db.query.pendingUploads.findFirst({ where: eq(pendingUploads.id, uploadId) });
    state.objects.set(pending!.storageKey, bytes);
    expect((await download(uploadId)).status).toBe(404);
    const completions = await Promise.all([1, 2].map(() => upload(request({ action: "complete", uploadId }))));
    expect(completions.map((response) => response.status).sort()).toEqual([200, 409]);
    fileId = (await completions.find((response) => response.status === 200)!.json()).fileId;
    const file = await db.query.files.findFirst({ where: eq(files.id, fileId) });
    expect(file?.sizeBytes).toBe(bytes.length);
    expect(file?.storageKey).not.toBe(pending!.storageKey);
  });

  it("sanitizes SVGs, rejects mismatched bytes, and cleans abandoned staging uploads", async () => {
    for (const [name, bytes, status] of [
      ["logo.svg", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script><rect width="10" height="10"/></svg>'), 200],
      ["fake.pdf", Buffer.from("<html>not a PDF</html>"), 400],
    ] as const) {
      const response = await upload(request({ action: "init", purpose: "asset", portalId, blockId, name, size: bytes.length }));
      const { uploadId } = await response.json();
      const pending = await db.query.pendingUploads.findFirst({ where: eq(pendingUploads.id, uploadId) });
      state.objects.set(pending!.storageKey, bytes);
      const completed = await upload(request({ action: "complete", uploadId }));
      expect(completed.status).toBe(status);
      if (status === 200) {
        const file = await db.query.files.findFirst({ where: eq(files.id, (await completed.json()).fileId) });
        expect(state.objects.get(file!.storageKey)!.toString()).not.toContain("script");
      }
    }
    const response = await upload(request({ action: "init", purpose: "asset", portalId, blockId, name: "abandoned.zip", size: 4 }));
    const { uploadId } = await response.json();
    await db.update(pendingUploads).set({ expiresAt: new Date(0) }).where(eq(pendingUploads.id, uploadId));
    expect((await upload(request({ action: "complete", uploadId }))).status).toBe(409);
    const deletedPortalId = crypto.randomUUID();
    await db.insert(portals).values({ id: deletedPortalId, agencyId, clientName: "Deleted", slug: "deleted-client" });
    const staged = await upload(request({ action: "init", purpose: "logo", portalId: deletedPortalId, name: "logo.png", size: 8 }));
    const deletedUploadId = (await staged.json()).uploadId;
    await db.delete(portals).where(eq(portals.id, deletedPortalId));
    expect(await db.query.pendingUploads.findFirst({ where: eq(pendingUploads.id, deletedUploadId) })).toBeTruthy();
    await db.update(pendingUploads).set({ expiresAt: new Date(0) }).where(eq(pendingUploads.id, deletedUploadId));
    expect(await cleanupExpiredUploads()).toBe(1);
    expect(await db.query.pendingUploads.findFirst({ where: eq(pendingUploads.id, uploadId) })).toBeUndefined();
  });

  it("authorizes five parallel client downloads and denies hidden/unpublished/foreign portals", async () => {
    await db.update(portals).set({ isPublished: true }).where(eq(portals.id, portalId));
    state.cookies.clear();
    expect((await download(fileId)).status).toBe(404);
    await expect(portalPasswordLoginAction(null, form({ slug: "test-client", password: "portal-password" }))).rejects.toThrow("REDIRECT:");
    const responses = await Promise.all(Array.from({ length: 5 }, () => download(fileId)));
    for (const response of responses) {
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toContain("storage.example/portals/");
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(await response.text()).toBe("");
    }
    await db.update(pages).set({ isHidden: true }).where(eq(pages.id, pageId));
    expect((await download(fileId)).status).toBe(404);
    await db.update(pages).set({ isHidden: false }).where(eq(pages.id, pageId));
    await db.update(portals).set({ isPublished: false }).where(eq(portals.id, portalId));
    expect((await download(fileId)).status).toBe(404);
    await db.update(portals).set({ isPublished: true }).where(eq(portals.id, portalId));
    const foreignPortal = crypto.randomUUID();
    await db.insert(portals).values({ id: foreignPortal, agencyId, clientName: "Other", slug: "other-client" });
    const session = await createSession({ kind: "portal", portalId: foreignPortal, portalUserId: null }, 1);
    state.cookies.set(portalCookieName(portalId), session.token);
    expect((await download(fileId)).status).toBe(404);
    expect(zipGet().status).toBe(410);
  });

  it("revokes shared-password sessions and consumes reset links exactly once", async () => {
    const stale = await createSession({ kind: "portal", portalId, portalUserId: null }, 1);
    state.cookies.set("bp_admin", adminCookie);
    await updateAccessAction(null, form({ portalId, accessMode: "password", password: "replacement-password" }));
    expect(await db.query.sessions.findFirst({ where: eq(sessions.id, sha256(stale.token)) })).toBeUndefined();
    await db.update(portals).set({ accessMode: "email" }).where(eq(portals.id, portalId));
    const userId = crypto.randomUUID();
    await db.insert(portalUsers).values({ id: userId, portalId, email: "client@example.test", inviteTokenHash: sha256("invite"), inviteExpiresAt: new Date(Date.now() + 60000) });
    const old = await createSession({ kind: "portal", portalId, portalUserId: userId }, 1);
    const attempts = await Promise.allSettled([1, 2].map(() => acceptInviteAction(null, form({ slug: "test-client", token: "invite", password: "new-password", confirm: "new-password" }))));
    expect(attempts.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(await db.query.sessions.findFirst({ where: eq(sessions.id, sha256(old.token)) })).toBeUndefined();
    const user = await db.query.portalUsers.findFirst({ where: eq(portalUsers.id, userId) });
    expect(user?.inviteTokenHash).toBeNull();
    expect(await verifyPassword("new-password", user?.passwordHash)).toBe(true);
    expect(await db.select().from(sessions).where(and(eq(sessions.portalUserId, userId), eq(sessions.kind, "portal")))).toHaveLength(1);
    await Promise.all(Array.from({ length: 5 }, () => recordFailedAttempt("deployment-test")));
    expect((await db.query.loginAttempts.findFirst({ where: eq(loginAttempts.key, "deployment-test") }))?.count).toBe(5);
  });
});
