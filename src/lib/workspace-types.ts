export type TaskStatus = "Pendente" | "Em progresso" | "Finalizado";
export type TaskPriority = "Urgente" | "Alta" | "Média" | "Baixa";
export type ProjectStatus = "Ativo" | "Concluído" | "Inativo";
export type ThemePreference = "Claro" | "Escuro" | "Sistema";

export type User = {
  id: string;
  name: string;
  email: string | null;
  jobTitle: string;
  phone: string;
  accessRole: string;
  status: "Ativo" | "Inativo";
  initials: string;
  color: string;
  hasAccess?: boolean;
};

export type ChecklistItem = {
  id: string;
  title: string;
  completed: boolean;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  projectId: string;
  project: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIds: string[];
  assignees: User[];
  owner: string;
  initials: string;
  dueDate: string | null;
  tags: string[];
  checklist: ChecklistItem[];
};

export type Project = {
  id: string;
  name: string;
  desc: string;
  status: ProjectStatus;
  progress: number;
  tasks: number;
  dueDate: string | null;
  initials: string[];
  color: string;
};

export type WorkspaceData = {
  provider: "local" | "supabase";
  users: User[];
  projects: Project[];
  tasks: Task[];
  taskTrends: TaskTrend[];
  recentActivity: TaskActivity[];
};

export type TaskTrend = {
  date: string;
  created: number;
  completed: number;
};

export type TaskActivity = {
  id: string;
  eventType: "task_created" | "task_updated" | "task_status_changed";
  actorId: string | null;
  actorName: string;
  actorInitials: string;
  actorColor: string;
  taskTitle: string;
  projectName: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
  occurredAt: string;
};
