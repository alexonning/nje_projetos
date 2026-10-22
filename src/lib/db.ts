import "server-only";
import { Pool } from "pg";
import { getDatabaseConfig } from "./database-config.mjs";

const globalForDatabase = globalThis as typeof globalThis & { nexoPostgresPool?: Pool };

export const databaseConfig = getDatabaseConfig();
export const pool = globalForDatabase.nexoPostgresPool ?? new Pool(databaseConfig);

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.nexoPostgresPool = pool;
}
