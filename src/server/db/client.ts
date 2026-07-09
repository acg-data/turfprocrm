import { mkdirSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import * as schema from "./schema";

export type Db = import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema>;

let dbPromise: Promise<Db> | null = null;

/**
 * On Replit, DATABASE_URL points at the built-in Postgres. Anywhere else
 * (local dev, CI, tests) we fall back to an embedded PGlite database so the
 * app runs with zero external services.
 */
export function getDb(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = initDb().catch((error) => {
      dbPromise = null; // allow retry on the next request instead of caching the failure
      throw error;
    });
  }
  return dbPromise;
}

async function initDb(): Promise<Db> {
  if (process.env.DATABASE_URL) {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });
    await runMigrations(async (sql) => {
      await pool.query(sql);
    });
    return db as Db;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const dataDir = process.env.PGLITE_DATA_DIR ?? (process.env.NODE_ENV === "test" ? undefined : ".data/pglite");
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  const pglite = dataDir ? new PGlite(dataDir) : new PGlite();
  const db = drizzle(pglite, { schema });
  await runMigrations(async (sql) => {
    await pglite.exec(sql);
  });
  // PGlite and node-postgres drizzle instances share the same query API surface we use.
  return db as unknown as Db;
}

async function runMigrations(exec: (sql: string) => Promise<unknown>) {
  await exec(`CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at bigint NOT NULL)`);
  const dir = join(process.cwd(), "drizzle");
  let files: string[] = [];
  try {
    files = readdirSync(dir)
      .filter((file) => file.endsWith(".sql"))
      .sort();
  } catch {
    return;
  }
  for (const file of files) {
    const already = (await execReturning(exec, `SELECT name FROM _migrations WHERE name = '${file.replace(/'/g, "''")}'`)) as boolean;
    if (already) continue;
    const raw = readFileSync(join(dir, file), "utf8");
    for (const statement of raw.split("--> statement-breakpoint")) {
      const sql = statement.trim();
      if (sql) await exec(sql);
    }
    await exec(`INSERT INTO _migrations (name, applied_at) VALUES ('${file.replace(/'/g, "''")}', ${Date.now()})`);
  }
}

async function execReturning(exec: (sql: string) => Promise<unknown>, sql: string) {
  const result = (await exec(sql)) as { rows?: unknown[] } | Array<{ rows?: unknown[] }> | undefined;
  if (Array.isArray(result)) return (result[0]?.rows?.length ?? 0) > 0;
  return (result?.rows?.length ?? 0) > 0;
}
