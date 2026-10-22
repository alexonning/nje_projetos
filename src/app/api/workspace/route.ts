import { apiError, requireApiUser } from "@/lib/api-access";
import { pool, databaseConfig } from "@/lib/db";
import type { ChecklistItem, Project, Task, User, WorkspaceData } from "@/lib/workspace-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const authorization = await requireApiUser(request);
  if ("response" in authorization) return authorization.response;

  try {
    const [usersResult, projectsResult, tasksResult, assigneesResult, tagsResult, checklistResult] = await Promise.all([
      pool.query("SELECT u.id, u.name, u.email, u.job_title, u.phone, u.access_role, u.status, u.initials, u.color, (c.user_id IS NOT NULL) AS has_access FROM nexo.workspace_users u LEFT JOIN nexo.workspace_credentials c ON c.user_id = u.id ORDER BY u.created_at, u.name"),
      pool.query("SELECT id, name, description, status, progress, to_char(due_date, 'YYYY-MM-DD') AS due_date, color FROM nexo.projects ORDER BY created_at, name"),
      pool.query("SELECT id, project_id, title, description, status, priority, to_char(due_date, 'YYYY-MM-DD') AS due_date FROM nexo.tasks ORDER BY created_at DESC"),
      pool.query("SELECT ta.task_id, u.id, u.name, u.email, u.job_title, u.phone, u.access_role, u.status, u.initials, u.color FROM nexo.task_assignees ta JOIN nexo.workspace_users u ON u.id = ta.user_id ORDER BY u.name"),
      pool.query("SELECT tt.task_id, tag.name FROM nexo.task_tags tt JOIN nexo.tags tag ON tag.id = tt.tag_id ORDER BY tag.name"),
      pool.query("SELECT id, task_id, title, is_completed FROM nexo.task_checklist_items ORDER BY position, id"),
    ]);

    const users: User[] = usersResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      jobTitle: row.job_title,
      phone: row.phone,
      accessRole: row.access_role,
      status: row.status,
      initials: row.initials,
      color: row.color,
      hasAccess: row.has_access,
    }));
    const userById = new Map(users.map((user) => [user.id, user]));
    const assigneesByTask = new Map<string, User[]>();
    for (const row of assigneesResult.rows) {
      const user = userById.get(row.id);
      if (user) assigneesByTask.set(row.task_id, [...(assigneesByTask.get(row.task_id) ?? []), user]);
    }
    const tagsByTask = new Map<string, string[]>();
    for (const row of tagsResult.rows) tagsByTask.set(row.task_id, [...(tagsByTask.get(row.task_id) ?? []), row.name]);
    const checklistByTask = new Map<string, ChecklistItem[]>();
    for (const row of checklistResult.rows) {
      checklistByTask.set(row.task_id, [...(checklistByTask.get(row.task_id) ?? []), { id: row.id, title: row.title, completed: row.is_completed }]);
    }

    const tasks: Task[] = tasksResult.rows.map((row) => {
      const assignees = assigneesByTask.get(row.id) ?? [];
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        projectId: row.project_id,
        project: "",
        status: row.status,
        priority: row.priority,
        assigneeIds: assignees.map((user) => user.id),
        assignees,
        owner: assignees.map((user) => user.name).join(", ") || "Sem responsável",
        initials: assignees[0]?.initials || "--",
        dueDate: row.due_date,
        tags: tagsByTask.get(row.id) ?? [],
        checklist: checklistByTask.get(row.id) ?? [],
      };
    });

    const taskByProjectId = new Map(tasksResult.rows.map((row) => [row.id, row.project_id]));
    const tasksByProjectId = new Map<string, Task[]>();
    for (const task of tasks) {
      const projectId = taskByProjectId.get(task.id);
      if (projectId) tasksByProjectId.set(projectId, [...(tasksByProjectId.get(projectId) ?? []), task]);
      task.project = projectsResult.rows.find((project) => project.id === projectId)?.name ?? "Projeto removido";
    }

    const projects: Project[] = projectsResult.rows.map((row) => {
      const projectTasks = tasksByProjectId.get(row.id) ?? [];
      const initials = [...new Set(projectTasks.flatMap((task) => task.assignees.map((user) => user.initials)))].slice(0, 3);
      return {
        id: row.id,
        name: row.name,
        desc: row.description,
        status: row.status,
        progress: row.progress,
        tasks: projectTasks.length,
        dueDate: row.due_date,
        initials,
        color: row.color,
      };
    });

    const data: WorkspaceData = { provider: databaseConfig.provider, users, projects, tasks };
    return Response.json(data);
  } catch (error) {
    return apiError(error, "Falha ao carregar os dados. Confira a conexão e execute npm run db:migrate.");
  }
}
