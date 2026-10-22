import { readFile } from "node:fs/promises";
import pg from "pg";
import { getDatabaseConfig } from "../src/lib/database-config.mjs";

const config = getDatabaseConfig();
const client = new pg.Client(config);

try {
  await client.connect();
  const schema = await readFile(new URL("../database/schema.sql", import.meta.url), "utf8");
  await client.query(schema);
  console.log(`Schema aplicado no PostgreSQL (${config.provider}).`);
} catch (error) {
  console.error("Não foi possível aplicar o schema.", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
