import { apiError, developmentOnlyResponse } from "@/lib/api-access";
import { pool } from "@/lib/db";
import { projectSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const blocked = developmentOnlyResponse();
  if (blocked) return blocked;

  const parsed = projectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Confira nome, descrição e prazo do projeto." }, { status: 400 });

  try {
    const { name, description, dueDate } = parsed.data;
    const result = await pool.query(
      "INSERT INTO nexo.projects (name, description, due_date) VALUES ($1, $2, $3) RETURNING id",
      [name, description, dueDate],
    );
    return Response.json({ id: result.rows[0].id }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return Response.json({ error: "Já existe um projeto com esse nome." }, { status: 409 });
    }
    return apiError(error, "Não foi possível salvar o projeto.");
  }
}
