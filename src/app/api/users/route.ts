import { apiError, requireApiUser } from "@/lib/api-access";
import { hashPassword } from "@/lib/passwords.mjs";
import { pool } from "@/lib/db";
import { userCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const authorization = await requireApiUser(request, true);
  if ("response" in authorization) return authorization.response;

  const parsed = userCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Confira nome, e-mail e os campos de senha." }, { status: 400 });

  const client = await pool.connect();
  try {
    const { name, email, jobTitle, phone, password } = parsed.data;
    const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
    const passwordHash = await hashPassword(password);
    await client.query("BEGIN");
    const result = await client.query(
      "INSERT INTO nexo.workspace_users (name, email, job_title, phone, initials, color) VALUES ($1, $2, $3, $4, $5, 'purple') RETURNING id",
      [name, email, jobTitle, phone, initials],
    );
    await client.query("INSERT INTO nexo.workspace_credentials (user_id, password_hash) VALUES ($1, $2)", [result.rows[0].id, passwordHash]);
    await client.query("COMMIT");
    return Response.json({ id: result.rows[0].id }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return Response.json({ error: "Já existe um usuário com esse e-mail." }, { status: 409 });
    }
    return apiError(error, "Não foi possível salvar o usuário.");
  } finally {
    client.release();
  }
}
