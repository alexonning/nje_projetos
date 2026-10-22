import { apiError, developmentOnlyResponse } from "@/lib/api-access";
import { pool } from "@/lib/db";
import { userCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const blocked = developmentOnlyResponse();
  if (blocked) return blocked;

  const parsed = userCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Informe um nome e confira os dados do usuário." }, { status: 400 });

  try {
    const { name, email, jobTitle, phone } = parsed.data;
    const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
    const result = await pool.query(
      "INSERT INTO nexo.workspace_users (name, email, job_title, phone, initials, color) VALUES ($1, $2, $3, $4, $5, 'purple') RETURNING id",
      [name, email ?? null, jobTitle, phone, initials],
    );
    return Response.json({ id: result.rows[0].id }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return Response.json({ error: "Já existe um usuário com esse e-mail." }, { status: 409 });
    }
    return apiError(error, "Não foi possível salvar o usuário.");
  }
}
