import { readFile } from "node:fs/promises";
import pg from "pg";
import { getDatabaseConfig } from "../src/lib/database-config.mjs";

const config = getDatabaseConfig();
const client = new pg.Client(config);

try {
  await client.connect();
  const seed = await readFile(new URL("../database/seed.sql", import.meta.url), "utf8");
  await client.query("BEGIN");
  await client.query(seed);
  await client.query("COMMIT");
  console.log(`Dados demonstrativos inseridos sem substituir registros (${config.provider}).`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Não foi possível inserir os dados demonstrativos.", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
