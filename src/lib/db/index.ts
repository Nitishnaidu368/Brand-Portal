import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Connections are lazy: builds can run without a live database. Local Postgres is the dev default.
const globalForDb = globalThis as unknown as { __brandPortalSql?: ReturnType<typeof postgres> };
export const sqlClient = (globalForDb.__brandPortalSql ??= postgres(
  process.env.DATABASE_URL || "postgres://postgres:postgres@127.0.0.1:5432/brand_portal",
  { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 10 },
));
export const db = drizzle(sqlClient, { schema });
export type Database = typeof db;
