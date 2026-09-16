// The free storage tier accepts at most 50 MiB per object.
const uploadMb = Number(process.env.MAX_UPLOAD_MB ?? 50);
if (!Number.isFinite(uploadMb) || uploadMb <= 0 || uploadMb > 50) {
  throw new Error("MAX_UPLOAD_MB must be greater than 0 and at most 50.");
}
export const MAX_UPLOAD_BYTES = Math.floor(uploadMb * 1024 * 1024);
export const ADMIN_SESSION_DAYS = 14;
export const PORTAL_SESSION_DAYS = 30;
export const INVITE_DAYS = 7;
export const SECURE_COOKIES =
  process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1";
