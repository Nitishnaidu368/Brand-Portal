/**
 * SQLite via Node's built-in `node:sqlite`, wrapped in Drizzle's proxy driver.
 * Migrations in /drizzle run once per process before the first query.
 *
 * To move to Postgres/Supabase: switch schema.ts to `drizzle-orm/pg-core`, regenerate
 * migrations, and replace this file with `drizzle-orm/postgres-js`.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { drizzle, type SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import { migrate } from "drizzle-orm/sqlite-proxy/migrator";
import { DB_PATH, MIGRATIONS_DIR } from "../config";
import * as schema from "./schema";

type Method = "run" | "all" | "values" | "get";
export type Database = SqliteRemoteDatabase<typeof schema>;

function toSqlValue(value: unknown): SQLInputValue {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.getTime();
  return value as SQLInputValue;
}

function execute(sqlite: DatabaseSync, sql: string, params: unknown[], method: Method) {
  const statement = sqlite.prepare(sql);
  const args = params.map(toSqlValue);
  if (method === "run") {
    statement.run(...args);
    return { rows: [] };
  }
  statement.setReturnArrays(true);
  if (method === "get") {
    // Drizzle expects a single row (not wrapped in an array) for `get`.
    return { rows: statement.get(...args) as unknown as unknown[] };
  }
  return { rows: statement.all(...args) as unknown[] };
}

function transaction<T>(sqlite: DatabaseSync, fn: () => T): T {
  sqlite.exec("BEGIN");
  try {
    const result = fn();
    sqlite.exec("COMMIT");
    return result;
  } catch (error) {
    sqlite.exec("ROLLBACK");
    throw error;
  }
}

function createDatabase() {
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sqlite = new DatabaseSync(DB_PATH);
  sqlite.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");

  const migrator = drizzle(async (sql, params, method) => execute(sqlite, sql, params, method), { schema });
  const ready = migrate(
    migrator,
    async (queries) => {
      transaction(sqlite, () => {
        for (const query of queries) sqlite.exec(query);
      });
    },
    { migrationsFolder: MIGRATIONS_DIR },
  );

  const db = drizzle(
    async (sql, params, method) => {
      await ready;
      return execute(sqlite, sql, params, method);
    },
    // Batches run synchronously inside one transaction, so they are atomic.
    async (queries) => {
      await ready;
      return transaction(sqlite, () => queries.map((q) => execute(sqlite, q.sql, q.params, q.method)));
    },
    { schema },
  );

  return { db, ready };
}

const globalForDb = globalThis as unknown as { __brandPortalDb?: ReturnType<typeof createDatabase> };
const instance = (globalForDb.__brandPortalDb ??= createDatabase());

export const db: Database = instance.db;
export const dbReady = instance.ready;
