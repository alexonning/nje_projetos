import pg from "pg";
import { getDatabaseConfig } from "../src/lib/database-config.mjs";

const config = getDatabaseConfig();
const client = new pg.Client(config);

try {
  await client.connect();
  const result = await client.query("SELECT current_database() AS database, current_user AS user, inet_server_port() AS port");
  console.log(`Conexão PostgreSQL OK (${config.provider}):`, result.rows[0]);
} catch (error) {
  console.error("Falha na conexão PostgreSQL.", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
