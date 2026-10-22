import pg from "pg";
import { getDatabaseConfig } from "../src/lib/database-config.mjs";
import { hashPassword } from "../src/lib/passwords.mjs";

const name = process.env.AUTH_BOOTSTRAP_ADMIN_NAME?.trim();
const email = process.env.AUTH_BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.AUTH_BOOTSTRAP_ADMIN_PASSWORD;

if (!name || !email || !password) {
  console.error("Configure AUTH_BOOTSTRAP_ADMIN_NAME, AUTH_BOOTSTRAP_ADMIN_EMAIL e AUTH_BOOTSTRAP_ADMIN_PASSWORD no ambiente.");
  process.exit(1);
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("AUTH_BOOTSTRAP_ADMIN_EMAIL precisa ser um e-mail válido.");
  process.exit(1);
}
if (password.length < 12 || password.length > 128) {
  console.error("AUTH_BOOTSTRAP_ADMIN_PASSWORD precisa ter entre 12 e 128 caracteres.");
  process.exit(1);
}

const config = getDatabaseConfig();
const client = new pg.Client(config);

try {
  await client.connect();
  await client.query("BEGIN");

  const existingAdmin = await client.query(
    `SELECT u.id FROM nexo.workspace_users u
     JOIN nexo.workspace_credentials c ON c.user_id = u.id
     WHERE u.access_role = 'Administrador'
     LIMIT 1`,
  );
  if (existingAdmin.rowCount) throw new Error("Já existe uma conta de administrador autenticável. O bootstrap inicial foi recusado.");

  const matchingUser = await client.query(
    "SELECT id FROM nexo.workspace_users WHERE lower(email) = $1 LIMIT 2 FOR UPDATE",
    [email],
  );
  if (matchingUser.rowCount > 1) throw new Error("Há perfis duplicados com esse e-mail. Corrija os dados antes do bootstrap.");

  let userId;
  if (matchingUser.rowCount === 1) {
    userId = matchingUser.rows[0].id;
    const existingCredentials = await client.query("SELECT 1 FROM nexo.workspace_credentials WHERE user_id = $1", [userId]);
    if (existingCredentials.rowCount) throw new Error("Esse e-mail já possui credenciais. O bootstrap inicial foi recusado.");
    const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
    await client.query(
      `UPDATE nexo.workspace_users
       SET name = $1, email = $2, access_role = 'Administrador', status = 'Ativo', initials = $3, updated_at = now()
       WHERE id = $4`,
      [name, email, initials, userId],
    );
  } else {
    const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
    const inserted = await client.query(
      `INSERT INTO nexo.workspace_users (name, email, job_title, access_role, status, initials, color)
       VALUES ($1, $2, 'Administrador', 'Administrador', 'Ativo', $3, 'purple')
       RETURNING id`,
      [name, email, initials],
    );
    userId = inserted.rows[0].id;
  }

  const passwordHash = await hashPassword(password);
  await client.query("INSERT INTO nexo.workspace_credentials (user_id, password_hash) VALUES ($1, $2)", [userId, passwordHash]);
  await client.query("COMMIT");
  console.log(`Administrador inicial configurado para ${email}. Remova AUTH_BOOTSTRAP_ADMIN_PASSWORD do ambiente após o uso.`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Não foi possível configurar o administrador inicial.", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
