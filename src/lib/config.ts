import path from "node:path";

export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR)
  : path.join(process.cwd(), "data");
export const DB_PATH = path.join(DATA_DIR, "portal.db");
export const STORAGE_DIR = path.join(DATA_DIR, "storage");
export const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 50) * 1024 * 1024;

export const ADMIN_SESSION_DAYS = 14;
export const PORTAL_SESSION_DAYS = 30;
export const INVITE_DAYS = 7;

export const SECURE_COOKIES =
  process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1";
