import { apiError, requireApiUser } from "@/lib/api-access";
import { ADMIN_ROLE } from "@/lib/auth";
import { pool } from "@/lib/db";
import { userUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const authorization = await requireApiUser(request);
  if ("response" in authorization) return authorization.response;

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Identificador de usuário inválido." }, { status: 400 });
  if (authorization.user.id !== id && authorization.user.accessRole !== ADMIN_ROLE) {
    return Response.json({ error: "Somente um administrador pode editar este usuário." }, { status: 403 });
  }
  const parsed = userUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) return Response.json({ error: "Confira os dados do usuário." }, { status: 400 });
  if ("status" in parsed.data && authorization.user.accessRole !== ADMIN_ROLE) {
    return Response.json({ error: "Somente um administrador pode alterar a situação do usuário." }, { status: 403 });
  }
  if (parsed.data.status === "Inativo" && authorization.user.id === id) {
    return Response.json({ error: "Não é possível desativar a própria conta durante esta sessão." }, { status: 400 });
  }

  const columnMap = { name: "name", email: "email", jobTitle: "job_title", phone: "phone", status: "status" } as const;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query(
      `SELECT u.email, u.status, EXISTS (SELECT 1 FROM nexo.workspace_credentials c WHERE c.user_id = u.id) AS has_credentials
       FROM nexo.workspace_users u WHERE u.id = $1 FOR UPDATE`,
      [id],
    );
    if (!current.rowCount) {
      await client.query("ROLLBACK");
      return Response.json({ error: "Usuário não encontrado." }, { status: 404 });
    }
    const nextEmail = "email" in parsed.data ? parsed.data.email : current.rows[0].email;
    if (current.rows[0].has_credentials && !nextEmail) {
      await client.query("ROLLBACK");
      return Response.json({ error: "Um usuário com acesso precisa manter um e-mail cadastrado." }, { status: 400 });
    }

    const values: unknown[] = [];
    const assignments: string[] = [];
    for (const [key, column] of Object.entries(columnMap)) {
      if (key in parsed.data) {
        values.push(parsed.data[key as keyof typeof parsed.data]);
        assignments.push(`${column} = $${values.length}`);
      }
    }
    if ("name" in parsed.data) {
      const name = parsed.data.name ?? "";
      const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
      values.push(initials);
      assignments.push(`initials = $${values.length}`);
    }
    if (!assignments.length) {
      await client.query("ROLLBACK");
      return Response.json({ id, saved: true });
    }
    assignments.push("updated_at = now()");
    values.push(id);
    const result = await client.query(`UPDATE nexo.workspace_users SET ${assignments.join(", ")} WHERE id = $${values.length} RETURNING id`, values);
    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return Response.json({ error: "Usuário não encontrado." }, { status: 404 });
    }
    if (parsed.data.status === "Inativo" && current.rows[0].status !== "Inativo") {
      await client.query("DELETE FROM nexo.workspace_sessions WHERE user_id = $1", [id]);
    }
    await client.query("COMMIT");
    return Response.json({ id, saved: true });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return Response.json({ error: "Já existe um usuário com esse e-mail." }, { status: 409 });
    }
    return apiError(error, "Não foi possível atualizar o usuário.");
  } finally {
    client.release();
  }
}
