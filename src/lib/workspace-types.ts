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
};
