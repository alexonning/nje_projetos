/**
 * @typedef {"local" | "supabase"} DatabaseProvider
 * @typedef {{ provider: DatabaseProvider, connectionString: string, max: number, ssl: false | { rejectUnauthorized: true, ca: string } }} DatabaseConfig
 */

/** @param {NodeJS.ProcessEnv} [env] @returns {DatabaseConfig} */
export function getDatabaseConfig(env = process.env) {
  const provider = env.DATABASE_PROVIDER || "local";
  if (provider !== "local" && provider !== "supabase") {
    throw new Error('DATABASE_PROVIDER precisa ser "local" ou "supabase".');
  }

  const connectionString = provider === "local"
    ? env.LOCAL_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres"
    : env.SUPABASE_DATABASE_URL;

  if (!connectionString) {
    throw new Error(`Configure ${provider === "local" ? "LOCAL_DATABASE_URL" : "SUPABASE_DATABASE_URL"} no ambiente do servidor.`);
  }

  const sslCa = provider === "supabase"
    ? env.SUPABASE_DATABASE_SSL_CA?.replace(/\\n/g, "\n")
    : undefined;

  if (provider === "supabase" && !sslCa) {
    throw new Error("Configure SUPABASE_DATABASE_SSL_CA para validar o certificado SSL do Supabase.");
  }

  return {
    provider,
    connectionString,
    max: provider === "supabase" ? 1 : 10,
    ssl: provider === "supabase" ? { rejectUnauthorized: true, ca: sslCa } : false,
  };
}
