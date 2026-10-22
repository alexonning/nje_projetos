import { apiError } from "@/lib/api-access";
import { clearLoginFailures, createSession, emailAttemptHash, isLoginLocked, isSameOriginMutation, recordLoginFailure } from "@/lib/auth";
import { pool } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/passwords.mjs";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginMutation(request)) return Response.json({ error: "Origem da solicitação inválida." }, { status: 403 });

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Informe um e-mail e uma senha válidos." }, { status: 400 });

  try {
    const email = parsed.data.email;
    const attemptHash = emailAttemptHash(email);
    if (await isLoginLocked(attemptHash)) {
      return Response.json({ error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." }, { status: 429 });
    }

    const result = await pool.query(
      `SELECT u.id, u.status, c.password_hash
       FROM nexo.workspace_users u
       LEFT JOIN nexo.workspace_credentials c ON c.user_id = u.id
       WHERE lower(u.email) = $1
       LIMIT 1`,
      [email],
    );
    const user = result.rows[0];
    const passwordMatches = user?.password_hash
      ? await verifyPassword(parsed.data.password, user.password_hash)
      : await hashPassword(parsed.data.password).then(() => false);

    if (!user || user.status !== "Ativo" || !passwordMatches) {
      const locked = await recordLoginFailure(attemptHash);
      return Response.json(
        { error: locked ? "Muitas tentativas. Aguarde 15 minutos e tente novamente." : "E-mail ou senha incorretos." },
        { status: locked ? 429 : 401 },
      );
    }

    await clearLoginFailures(attemptHash);
    await createSession(user.id);
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error, "Não foi possível iniciar a sessão.");
  }
}
