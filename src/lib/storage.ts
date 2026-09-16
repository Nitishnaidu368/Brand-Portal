import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;
export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "brand-portal";

export function supabase() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.");
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}

export const storageBucket = () => supabase().storage.from(STORAGE_BUCKET);

export async function putObject(key: string, data: Uint8Array, contentType = "application/octet-stream") {
  const { error } = await storageBucket().upload(key, data, { contentType, upsert: true, cacheControl: "60" });
  if (error) throw error;
}

export async function getObject(key: string) {
  const { data, error } = await storageBucket().download(key);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

export async function objectExists(key: string) {
  const { data, error } = await storageBucket().exists(key);
  if (error) throw error;
  return data;
}

export async function signedObjectUrl(key: string, filename?: string) {
  // ponytail: links remain usable for 60 seconds after revocation; proxy bytes if immediate revocation is needed.
  const { data, error } = await storageBucket().createSignedUrl(key, 60, filename ? { download: filename } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteObject(key: string) {
  const { error } = await storageBucket().remove([key]);
  if (error) throw error;
}

export async function deletePrefix(prefix: string) {
  // Delete a page at a time, including nested variant folders; never use offsets while deleting.
  for (;;) {
    const { data, error } = await storageBucket().list(prefix, { limit: 100 });
    if (error) throw error;
    if (!data.length) return;
    for (const item of data) {
      const key = `${prefix}/${item.name}`;
      if (item.id) await deleteObject(key);
      else await deletePrefix(key);
    }
  }
}
