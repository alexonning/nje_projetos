import { apiError, requireApiUser } from "@/lib/api-access";
import { emailAttemptHash } from "@/lib/auth";
import { hashPassword } from "@/lib/passwords.mjs";
import { pool } from "@/lib/db";
import { passwordResetSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const authorization = await requireApiUser(request, true);
  if ("response" in authorization) return authorization.response;

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Identificador de usuário inválido." }, { status: 400 });
  const parsed = passwordResetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Informe senhas válidas e confirme que são iguais." }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const userResult = await client.query("SELECT email FROM nexo.workspace_users WHERE id = $1 FOR UPDATE", [id]);
    if (!userResult.rowCount) {
      await client.query("ROLLBACK");
      return Response.json({ error: "Usuário não encontrado." }, { status: 404 });
    }
    const email = userResult.rows[0].email as string | null;
    if (!email) {
      await client.query("ROLLBACK");
      return Response.json({ error: "Cadastre o e-mail do usuário antes de definir uma senha." }, { status: 400 });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    await client.query(
      `INSERT INTO nexo.workspace_credentials (user_id, password_hash, password_changed_at)
       VALUES ($1, $2, now())
       ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash, password_changed_at = now(), updated_at = now()`,
      [id, passwordHash],
    );
    await client.query("DELETE FROM nexo.workspace_sessions WHERE user_id = $1", [id]);
    await client.query("DELETE FROM nexo.workspace_auth_attempts WHERE email_hash = $1", [emailAttemptHash(email)]);
    await client.query("COMMIT");
    return Response.json({ id, saved: true });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    return apiError(error, "Não foi possível redefinir a senha.");
  } finally {
    client.release();
  }
}
