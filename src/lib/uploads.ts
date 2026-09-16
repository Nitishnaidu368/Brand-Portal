import { eq, lt } from "drizzle-orm";
import { db } from "./db";
import { pendingUploads } from "./db/schema";
import { deleteObject } from "./storage";

export async function cleanupExpiredUploads(limit = 100) {
  const expired = await db.select().from(pendingUploads)
    .where(lt(pendingUploads.expiresAt, new Date())).limit(limit);
  for (const upload of expired) {
    await deleteObject(upload.storageKey);
    await db.delete(pendingUploads).where(eq(pendingUploads.id, upload.id));
  }
  return expired.length;
}
