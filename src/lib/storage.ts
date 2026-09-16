/**
 * Local-disk object storage. Every read and write goes through these functions, so moving to
 * Supabase Storage or Cloudflare R2 means reimplementing this file only.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { STORAGE_DIR } from "./config";

function resolveKey(key: string) {
  const full = path.resolve(STORAGE_DIR, key);
  if (!full.startsWith(STORAGE_DIR + path.sep)) throw new Error(`Invalid storage key: ${key}`);
  return full;
}

export async function putObject(key: string, data: Uint8Array) {
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
}

export async function getObject(key: string) {
  return readFile(resolveKey(key));
}

export async function getObjectIfExists(key: string) {
  try {
    return await readFile(resolveKey(key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function deleteObject(key: string) {
  await rm(resolveKey(key), { force: true });
}

export async function deletePrefix(prefix: string) {
  await rm(resolveKey(prefix), { recursive: true, force: true });
}
