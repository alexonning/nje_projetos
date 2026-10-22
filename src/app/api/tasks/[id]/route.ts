import { apiError, requireApiUser } from "@/lib/api-access";
import { pool } from "@/lib/db";
import { taskUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const columns: Record<string, string> = {
  title: "title",
  description: "description",
  projectId: "project_id",
  status: "status",
  priority: "priority",
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const authorization = await requireApiUser(request);
  if ("response" in authorization) return authorization.response;

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Identificador de tarefa inválido." }, { status: 400 });
  const parsed = taskUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) return Response.json({ error: "Confira os dados da tarefa." }, { status: 400 });

  const client = await pool.connect();
  try {
    const updates = parsed.data;
    await client.query("BEGIN");
    const exists = await client.query("SELECT 1 FROM nexo.tasks WHERE id = $1", [id]);
    if (!exists.rowCount) {
      await client.query("ROLLBACK");
      return Response.json({ error: "Tarefa não encontrada." }, { status: 404 });
    }
    const assignments: string[] = [];
    const values: unknown[] = [];
    for (const [key, column] of Object.entries(columns)) {
      if (key in updates) {
        values.push(updates[key as keyof typeof updates]);
        assignments.push(`${column} = $${values.length}`);
      }
    }
    if ("dueDate" in updates) {
      values.push(updates.dueDate);
      assignments.push(`due_date = $${values.length}`);
    }
    if (assignments.length) {
      assignments.push("updated_at = now()");
      values.push(id);
      const result = await client.query(`UPDATE nexo.tasks SET ${assignments.join(", ")} WHERE id = $${values.length} RETURNING id`, values);
      if (!result.rowCount) {
        await client.query("ROLLBACK");
        return Response.json({ error: "Tarefa não encontrada." }, { status: 404 });
      }
    }

    if (updates.assigneeIds) {
      await client.query("DELETE FROM nexo.task_assignees WHERE task_id = $1", [id]);
      for (const userId of updates.assigneeIds) await client.query("INSERT INTO nexo.task_assignees (task_id, user_id) VALUES ($1, $2)", [id, userId]);
    }
    if (updates.tags) {
      await client.query("DELETE FROM nexo.task_tags WHERE task_id = $1", [id]);
      for (const name of [...new Set(updates.tags)]) {
        const tagResult = await client.query("INSERT INTO nexo.tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id", [name]);
        await client.query("INSERT INTO nexo.task_tags (task_id, tag_id) VALUES ($1, $2)", [id, tagResult.rows[0].id]);
      }
    }
    if (updates.checklist) {
      await client.query("DELETE FROM nexo.task_checklist_items WHERE task_id = $1", [id]);
      for (const [position, item] of updates.checklist.entries()) {
        await client.query(
          "INSERT INTO nexo.task_checklist_items (id, task_id, title, position, is_completed) VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5)",
          [item.id ?? null, id, item.title, position, item.completed],
        );
      }
    }

    await client.query("COMMIT");
    return Response.json({ id, saved: true });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23503") {
      return Response.json({ error: "O projeto ou responsável selecionado não existe." }, { status: 400 });
    }
    return apiError(error, "Não foi possível atualizar a tarefa.");
  } finally {
    client.release();
  }
}
