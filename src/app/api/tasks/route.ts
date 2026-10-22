import { apiError, requireApiUser } from "@/lib/api-access";
import { pool } from "@/lib/db";
import { taskCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const authorization = await requireApiUser(request);
  if ("response" in authorization) return authorization.response;

  const parsed = taskCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Confira os dados da tarefa e selecione um projeto válido." }, { status: 400 });

  const client = await pool.connect();
  try {
    const task = parsed.data;
    await client.query("BEGIN");
    const inserted = await client.query(
      "INSERT INTO nexo.tasks (project_id, title, description, status, priority, due_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [task.projectId, task.title, task.description, task.status, task.priority, task.dueDate],
    );
    const taskId = inserted.rows[0].id as string;

    for (const userId of task.assigneeIds) {
      await client.query("INSERT INTO nexo.task_assignees (task_id, user_id) VALUES ($1, $2)", [taskId, userId]);
    }
    for (const name of [...new Set(task.tags)]) {
      const tagResult = await client.query("INSERT INTO nexo.tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id", [name]);
      await client.query("INSERT INTO nexo.task_tags (task_id, tag_id) VALUES ($1, $2)", [taskId, tagResult.rows[0].id]);
    }
    for (const [position, item] of task.checklist.entries()) {
      await client.query("INSERT INTO nexo.task_checklist_items (task_id, title, position, is_completed) VALUES ($1, $2, $3, $4)", [taskId, item.title, position, item.completed]);
    }

    await client.query("COMMIT");
    return Response.json({ id: taskId }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23503") {
      return Response.json({ error: "O projeto ou responsável selecionado não existe." }, { status: 400 });
    }
    return apiError(error, "Não foi possível salvar a tarefa.");
  } finally {
    client.release();
  }
}
