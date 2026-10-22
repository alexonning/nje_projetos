import { apiError, developmentOnlyResponse } from "@/lib/api-access";
import { pool } from "@/lib/db";
import { userUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const blocked = developmentOnlyResponse();
  if (blocked) return blocked;

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Identificador de usuário inválido." }, { status: 400 });
  const parsed = userUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) return Response.json({ error: "Confira os dados do usuário." }, { status: 400 });

  const columnMap = { name: "name", email: "email", jobTitle: "job_title", phone: "phone" } as const;
  try {
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
    if (!assignments.length) return Response.json({ id, saved: true });
    assignments.push("updated_at = now()");
    values.push(id);
    const result = await pool.query(`UPDATE nexo.workspace_users SET ${assignments.join(", ")} WHERE id = $${values.length} RETURNING id`, values);
    if (!result.rowCount) return Response.json({ error: "Usuário não encontrado." }, { status: 404 });
    return Response.json({ id, saved: true });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return Response.json({ error: "Já existe um usuário com esse e-mail." }, { status: 409 });
    }
    return apiError(error, "Não foi possível atualizar o usuário.");
  }
}
