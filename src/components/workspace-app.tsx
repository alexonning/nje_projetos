"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, CalendarDays, Check,
  CheckCheck, ChevronDown, ChevronRight, Circle, CircleHelp, ClipboardList,
  Clock3, Command, Ellipsis, FolderKanban, LayoutDashboard, ListFilter, LogOut,
  Menu, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Plus, Search,
  Settings2, SlidersHorizontal, Sparkles, Users as UsersIcon, X, Zap,
} from "lucide-react";
import type { Project, Task, TaskActivity, TaskPriority, TaskStatus, TaskTrend, ThemePreference, User, WorkspaceData } from "@/lib/workspace-types";

type TaskPayload = {
  title: string;
  description: string;
  projectId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assigneeIds: string[];
  tags: string[];
  checklist: Array<{ id?: string; title: string; completed: boolean }>;
};

async function apiRequest<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const result = await response.json().catch(() => null) as { error?: string } | null;
  if (response.status === 401 && typeof window !== "undefined") window.location.assign("/login");
  if (!response.ok) throw new Error(result?.error || "Não foi possível concluir a operação.");
  return result as T;
}

function taskDateLabel(value: string | null): string {
  if (!value) return "Sem prazo";
  const today = new Date();
  const due = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(due.valueOf())) return "Sem prazo";
  if (due.toDateString() === today.toDateString()) return "Hoje";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(due).replace(".", "");
}

function projectDateLabel(value: string | null): string {
  if (!value) return "Sem prazo";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.valueOf())) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date).replace(" de ", " ");
}

function taskActivityTime(value: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).valueOf()) / 1000));
  const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  if (seconds < 60) return relative.format(-seconds, "second");
  if (seconds < 3600) return relative.format(-Math.floor(seconds / 60), "minute");
  if (seconds < 86400) return relative.format(-Math.floor(seconds / 3600), "hour");
  return relative.format(-Math.floor(seconds / 86400), "day");
}

function taskActivityLabel(activity: TaskActivity): string {
  if (activity.eventType === "task_created") return `${activity.actorName} criou uma tarefa`;
  if (activity.eventType === "task_status_changed" && activity.toStatus === "Finalizado") return `${activity.actorName} concluiu uma tarefa`;
  if (activity.eventType === "task_status_changed") return `${activity.actorName} alterou o status`;
  return `${activity.actorName} atualizou uma tarefa`;
}

function taskActivityDateLabel(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(new Date(`${value}T12:00:00`)).replace(".", "");
}

function useThemePreference() {
  const [theme, setTheme] = useState<ThemePreference>("Claro");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("nexo-theme");
    if (saved === "Claro" || saved === "Escuro" || saved === "Sistema") setTheme(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "Escuro" || (theme === "Sistema" && media.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    };
    apply();
    localStorage.setItem("nexo-theme", theme);
    if (theme === "Sistema") media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [ready, theme]);

  return [theme, setTheme] as const;
}

export default function WorkspaceApp({ initialUser }: { initialUser: User }) {
  const router = useRouter();
  const [page, setPage] = useState("Dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [taskTrends, setTaskTrends] = useState<TaskTrend[]>([]);
  const [recentActivity, setRecentActivity] = useState<TaskActivity[]>([]);
  const [provider, setProvider] = useState<WorkspaceData["provider"]>("local");
  const [loading, setLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskProjectLocked, setNewTaskProjectLocked] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newProjectId, setNewProjectId] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("Média");
  const [newAssigneeIds, setNewAssigneeIds] = useState<string[]>([]);
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newChecklist, setNewChecklist] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [toast, setToast] = useState("");
  const [selectedProject, setSelectedProject] = useState("Todos os projetos");
  const [taskDetails, setTaskDetails] = useState<Task | null>(null);
  const [checklistDraft, setChecklistDraft] = useState("");
  const [projectModal, setProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectDueDate, setNewProjectDueDate] = useState("");
  const [userModal, setUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState<{ name: string; email: string; jobTitle: string; phone: string; status: User["status"] }>({ name: "", email: "", jobTitle: "", phone: "", status: "Ativo" });
  const [passwordForm, setPasswordForm] = useState({ password: "", confirmation: "" });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [theme, setTheme] = useThemePreference();

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }, []);

  const reloadWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<WorkspaceData>("/api/workspace");
      setUsers(data.users);
      setProjects(data.projects);
      setTasks(data.tasks);
      setTaskTrends(data.taskTrends);
      setRecentActivity(data.recentActivity);
      setProvider(data.provider);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { void reloadWorkspace(); }, [reloadWorkspace]);

  const currentUser = users.find((user) => user.id === initialUser.id) ?? initialUser;
  const isAdmin = currentUser.accessRole === "Administrador";
  const visibleTasks = useMemo(() => tasks.filter((task) =>
    (task.title + " " + task.project + " " + task.owner + " " + task.tags.join(" ")).toLowerCase().includes(search.toLowerCase())
    && (selectedProject === "Todos os projetos" || task.project === selectedProject),
  ), [tasks, search, selectedProject]);
  const taskCount = tasks.length;
  const pendingCount = tasks.filter((task) => task.status === "Pendente").length;
  const doneCount = tasks.filter((task) => task.status === "Finalizado").length;

  const openNewTask = (projectName?: string) => {
    const project = projectName ? projects.find((item) => item.name === projectName) : undefined;
    setNewProjectId(project?.id ?? "");
    setNewTaskProjectLocked(Boolean(project));
    setShowNewTask(true);
  };

  const moveTask = async (task: Task, status: TaskStatus) => {
    try {
      await apiRequest(`/api/tasks/${task.id}`, "PATCH", { status });
      await reloadWorkspace();
      notify("Status atualizado com sucesso.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível atualizar o status.");
    }
  };

  const createTask = async () => {
    if (newTaskProjectLocked && !newProjectId) { notify("O projeto desta tarefa não está disponível."); return; }
    const projectId = newProjectId || projects[0]?.id;
    if (!newTitle.trim()) { notify("Informe o título da tarefa."); return; }
    if (!projectId) { notify("Crie ou selecione um projeto primeiro."); return; }
    const checklist = newChecklist.split(/\r?\n/).map((title) => title.trim()).filter(Boolean).map((title) => ({ title, completed: false }));
    const payload: TaskPayload = {
      title: newTitle.trim(), description: newDescription.trim(), projectId, status: "Pendente", priority: newPriority,
      dueDate: newDueDate || null, assigneeIds: newAssigneeIds, tags: newTags, checklist,
    };
    try {
      await apiRequest("/api/tasks", "POST", payload);
      await reloadWorkspace();
      setShowNewTask(false);
      setNewProjectId(""); setNewTaskProjectLocked(false);
      setNewTitle(""); setNewDescription(""); setNewAssigneeIds([]); setNewTags([]); setNewChecklist(""); setNewDueDate("");
      notify("Tarefa criada com sucesso.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível criar a tarefa.");
    }
  };

  const saveTask = async (task: Task) => {
    const payload: TaskPayload = {
      title: task.title, description: task.description, projectId: task.projectId, status: task.status, priority: task.priority,
      dueDate: task.dueDate, assigneeIds: task.assigneeIds, tags: task.tags,
      checklist: task.checklist.map(({ id, title, completed }) => ({ id, title, completed })),
    };
    try {
      await apiRequest(`/api/tasks/${task.id}`, "PATCH", payload);
      await reloadWorkspace();
      setTaskDetails(null);
      notify("Tarefa atualizada com sucesso.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível salvar a tarefa.");
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) { notify("Informe o nome do projeto."); return; }
    try {
      await apiRequest("/api/projects", "POST", { name: newProjectName.trim(), description: newProjectDescription.trim(), dueDate: newProjectDueDate || null });
      await reloadWorkspace();
      setNewProjectName(""); setNewProjectDescription(""); setNewProjectDueDate(""); setProjectModal(false); setPage("Projetos");
      notify("Projeto criado com sucesso.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível criar o projeto.");
    }
  };

  const openUserModal = (user?: User) => {
    setEditingUser(user ?? null);
    setUserForm({ name: user?.name ?? "", email: user?.email ?? "", jobTitle: user?.jobTitle ?? "", phone: user?.phone ?? "", status: user?.status ?? "Ativo" });
    setPasswordForm({ password: "", confirmation: "" });
    setUserModal(true);
  };

  const saveUser = async () => {
    if (!userForm.name.trim()) { notify("Informe o nome do usuário."); return; }
    if (!userForm.email.trim()) { notify("Informe o e-mail do usuário."); return; }
    if (!editingUser && passwordForm.password.length < 12) { notify("A senha precisa ter ao menos 12 caracteres."); return; }
    if (!editingUser && passwordForm.password !== passwordForm.confirmation) { notify("As senhas não coincidem."); return; }
    const profile = { name: userForm.name.trim(), email: userForm.email.trim().toLowerCase(), jobTitle: userForm.jobTitle.trim(), phone: userForm.phone.trim() };
    const body = editingUser ? { ...profile, status: userForm.status } : { ...profile, password: passwordForm.password, passwordConfirmation: passwordForm.confirmation };
    try {
      await apiRequest(editingUser ? `/api/users/${editingUser.id}` : "/api/users", editingUser ? "PATCH" : "POST", body);
      await reloadWorkspace();
      setUserModal(false); setEditingUser(null);
      notify(editingUser ? "Usuário atualizado com sucesso." : "Usuário adicionado com sucesso.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível salvar o usuário.");
    }
  };

  const saveUserPassword = async () => {
    if (!editingUser) return;
    if (passwordForm.password.length < 12) { notify("A senha precisa ter ao menos 12 caracteres."); return; }
    if (passwordForm.password !== passwordForm.confirmation) { notify("As senhas não coincidem."); return; }
    setPasswordBusy(true);
    try {
      await apiRequest(`/api/users/${editingUser.id}/password`, "POST", { password: passwordForm.password, passwordConfirmation: passwordForm.confirmation });
      setPasswordForm({ password: "", confirmation: "" });
      setUserModal(false);
      notify("Senha redefinida. As sessões anteriores foram encerradas.");
      if (editingUser.id === currentUser.id) {
        router.replace("/login");
        router.refresh();
      } else {
        await reloadWorkspace();
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível redefinir a senha.");
    } finally {
      setPasswordBusy(false);
    }
  };

  const signOut = async () => {
    try {
      await apiRequest("/api/auth/logout", "POST", {});
      router.replace("/login");
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível encerrar a sessão.");
    }
  };

  const saveProfile = async (profile: Pick<User, "name" | "email" | "jobTitle" | "phone">) => {
    if (!currentUser) { notify("Nenhum perfil disponível para editar."); return; }
    try {
      await apiRequest(`/api/users/${currentUser.id}`, "PATCH", { ...profile, email: profile.email || null });
      await reloadWorkspace(); setSettingsSaved(true); notify("Perfil atualizado com sucesso.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível salvar o perfil.");
    }
  };

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard },
    { label: "Projetos", icon: FolderKanban },
    ...(isAdmin ? [{ label: "Usuários", icon: UsersIcon }] : []),
    { label: "Configurações", icon: Settings2 },
  ];

  return <div className="app-shell">
    {mobileNav && <button className="mobile-scrim" aria-label="Fechar menu" onClick={() => setMobileNav(false)} />}
    <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileNav ? "mobile-open" : ""}`}>
      <div className="brand-row">
        <div className="brand-mark"><Command size={19} /></div>
        {!collapsed && <div className="brand-copy"><strong>nexo<span>.</span></strong><small>WORKSPACE</small></div>}
        <button className="icon-button collapse-button" aria-label="Recolher menu" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button>
      </div>
      {!collapsed && <div className="workspace-switch"><div className="workspace-avatar">A</div><div className="workspace-meta"><strong>{currentUser?.name ?? "Workspace"}</strong><span>Workspace pessoal</span></div><ChevronDown size={15} /></div>}
      <div className="nav-caption">{!collapsed && "MENU PRINCIPAL"}</div>
      <nav className="nav-list">
        {navItems.map((item) => <button key={item.label} className={`nav-item ${page === item.label ? "active" : ""}`} onClick={() => { setPage(item.label); setMobileNav(false); }} title={collapsed ? item.label : undefined}><item.icon size={18} />{!collapsed && <span>{item.label}</span>}{!collapsed && item.label === "Projetos" && <span className="nav-count">{projects.length}</span>}</button>)}
      </nav>
      {!collapsed && <div className="sidebar-section">
        <div className="sidebar-section-head"><span>SEUS PROJETOS</span><button className="tiny-icon" onClick={() => setProjectModal(true)} aria-label="Adicionar projeto"><Plus size={15} /></button></div>
        {projects.slice(0, 3).map((project) => <button className="project-nav" key={project.id} onClick={() => { setPage("Projetos"); setSelectedProject(project.name); }}><span className={`project-dot ${project.color}`} /><span>{project.name}</span></button>)}
        <button className="see-all" onClick={() => { setPage("Projetos"); setSelectedProject("Todos os projetos"); }}>Ver todos os projetos <ChevronRight size={14} /></button>
      </div>}
      <div className="sidebar-bottom">
        <button className="nav-item help-item" onClick={() => notify("Central de ajuda em breve.")}><CircleHelp size={18} />{!collapsed && <span>Central de ajuda</span>}</button>
        <div className="profile-row"><div className={`avatar avatar-${currentUser?.color ?? "purple"}`}>{currentUser?.initials ?? "AA"}</div>{!collapsed && <><div className="profile-copy"><strong>{currentUser?.name ?? "Usuário"}</strong><span>{currentUser?.accessRole ?? "Workspace"}</span></div><button className="tiny-icon" aria-label="Abrir configurações do perfil" onClick={() => setPage("Configurações")}><MoreHorizontal size={18} /></button></>}</div>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="topbar-left"><button className="icon-button mobile-menu-button" aria-label="Abrir menu" onClick={() => setMobileNav(true)}><Menu size={20} /></button><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>{page}</strong></div></div>
        <div className="topbar-actions"><div className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={page === "Projetos" ? "Buscar projetos pelo nome..." : "Buscar tarefas, projetos..."} aria-label="Buscar" /><kbd>⌘ K</kbd></div><button className="icon-button notification-button" aria-label="Notificações" onClick={() => notify("Você está em dia com as notificações.")}><Bell size={18} /><i /></button><div className={`top-avatar avatar-${currentUser?.color ?? "purple"}`}>{currentUser?.initials ?? "AA"}</div><button className="icon-button logout-button" aria-label="Sair" title="Sair" onClick={() => void signOut()}><LogOut size={17} /></button></div>
      </header>

      <div className="content-area">
        {page === "Dashboard" && <Dashboard userName={currentUser.name} tasks={tasks} taskTrends={taskTrends} recentActivity={recentActivity} projectCount={projects.length} taskCount={taskCount} pendingCount={pendingCount} doneCount={doneCount} onNewTask={() => openNewTask()} onNewProject={() => setProjectModal(true)} onPage={setPage} onTask={setTaskDetails} />}
        {page === "Projetos" && <ProjectsView projects={projects} selected={selectedProject} search={search} onSelect={setSelectedProject} onNew={() => setProjectModal(true)} onOpenProject={(name) => { setSelectedProject(name); setPage("Quadro Kanban"); }} />}
        {page === "Quadro Kanban" && <KanbanView tasks={visibleTasks.filter((task) => selectedProject === "Todos os projetos" || task.project === selectedProject)} onMove={moveTask} onTask={setTaskDetails} onNew={() => openNewTask(selectedProject === "Todos os projetos" ? undefined : selectedProject)} project={selectedProject} />}
        {page === "Usuários" && isAdmin && <UsersView users={users} onNew={() => openUserModal()} onEdit={openUserModal} />}
        {page === "Configurações" && <SettingsView user={currentUser} saved={settingsSaved} theme={theme} onTheme={setTheme} onSaveProfile={saveProfile} onSavePreferences={() => { setSettingsSaved(true); notify("Preferências salvas."); }} />}
        {loading && <div className="page-footnote">Carregando dados do PostgreSQL…</div>}
      </div>
    </main>

    {showNewTask && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowNewTask(false); }}><div className="modal"><div className="modal-head"><div><h2>Nova tarefa</h2><p>Adicione uma atividade ao seu projeto.</p></div><button className="icon-button" aria-label="Fechar" onClick={() => setShowNewTask(false)}><X size={18} /></button></div>
      <div className="form-field"><label htmlFor="task-title">Título da tarefa <em>*</em></label><input id="task-title" autoFocus value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Ex.: Implementar tela de relatórios" /></div>
      <div className="form-field"><label htmlFor="task-project">Projeto</label><select id="task-project" value={newProjectId || projects[0]?.id || ""} disabled={newTaskProjectLocked} onChange={(event) => setNewProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>{newTaskProjectLocked && <small className="form-hint">Esta tarefa será vinculada ao projeto aberto.</small>}</div>
      <div className="form-field"><label htmlFor="task-description">Descrição</label><textarea id="task-description" value={newDescription} onChange={(event) => setNewDescription(event.target.value)} placeholder="Descreva o que precisa ser feito." /></div>
      <div className="form-field"><label>Responsáveis</label><AssigneeOptions users={users} selected={newAssigneeIds} onChange={setNewAssigneeIds} /></div>
      <div className="form-field"><label>Tags</label><TagEditor tags={newTags} onChange={setNewTags} /></div>
      <div className="form-field"><label htmlFor="task-checklist">Etapas do checklist</label><textarea id="task-checklist" value={newChecklist} onChange={(event) => setNewChecklist(event.target.value)} placeholder={"Uma etapa por linha"} /></div>
      <div className="form-field"><label htmlFor="task-due">Prazo</label><input id="task-due" type="date" value={newDueDate} onChange={(event) => setNewDueDate(event.target.value)} /></div>
      <div className="form-field"><label htmlFor="task-priority">Prioridade</label><select id="task-priority" value={newPriority} onChange={(event) => setNewPriority(event.target.value as TaskPriority)}><option>Baixa</option><option>Média</option><option>Alta</option><option>Urgente</option></select></div>
      <div className="modal-actions"><button className="button secondary" onClick={() => setShowNewTask(false)}>Cancelar</button><button className="button primary" onClick={() => void createTask()}><Plus size={16} /> Criar tarefa</button></div>
    </div></div>}

    {projectModal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setProjectModal(false); }}><div className="modal"><div className="modal-head"><div><h2>Novo projeto</h2><p>Organize o trabalho em um novo espaço.</p></div><button className="icon-button" aria-label="Fechar" onClick={() => setProjectModal(false)}><X size={18} /></button></div>
      <div className="form-field"><label htmlFor="project-name">Nome do projeto <em>*</em></label><input id="project-name" autoFocus value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} placeholder="Ex.: Aplicativo mobile" /></div>
      <div className="form-field"><label htmlFor="project-description">Descrição</label><textarea id="project-description" value={newProjectDescription} onChange={(event) => setNewProjectDescription(event.target.value)} placeholder="Qual é o objetivo deste projeto?" /></div>
      <div className="form-field"><label htmlFor="project-due">Prazo final</label><input id="project-due" type="date" value={newProjectDueDate} onChange={(event) => setNewProjectDueDate(event.target.value)} /></div>
      <div className="modal-actions"><button className="button secondary" onClick={() => setProjectModal(false)}>Cancelar</button><button className="button primary" onClick={() => void createProject()}><Plus size={16} /> Criar projeto</button></div>
    </div></div>}

    {userModal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setUserModal(false); }}><div className="modal"><div className="modal-head"><div><h2>{editingUser ? "Editar usuário" : "Adicionar usuário"}</h2><p>{editingUser ? "Atualize os dados deste membro." : "Adicione alguém para colaborar."}</p></div><button className="icon-button" aria-label="Fechar" onClick={() => setUserModal(false)}><X size={18} /></button></div>
      <div className="form-field"><label htmlFor="user-name">Nome completo <em>*</em></label><input id="user-name" autoFocus value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} placeholder="Nome e sobrenome" /></div>
      <div className="form-field"><label htmlFor="user-email">E-mail <em>*</em></label><input id="user-email" type="email" required value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} placeholder="nome@empresa.com" /></div>
      <div className="form-field"><label htmlFor="user-job">Cargo</label><input id="user-job" value={userForm.jobTitle} onChange={(event) => setUserForm({ ...userForm, jobTitle: event.target.value })} placeholder="Ex.: Analista de projetos" /></div>
      <div className="form-field"><label htmlFor="user-phone">Telefone</label><input id="user-phone" type="tel" value={userForm.phone} onChange={(event) => setUserForm({ ...userForm, phone: event.target.value })} placeholder="(00) 00000-0000" /></div>
      {editingUser && <div className="form-field"><label htmlFor="user-status">Situação do usuário</label><select id="user-status" value={userForm.status} disabled={editingUser.id === currentUser.id} onChange={(event) => setUserForm({ ...userForm, status: event.target.value as User["status"] })}><option value="Ativo">Ativo</option><option value="Inativo">Inativo</option></select>{editingUser.id === currentUser.id && <small className="form-hint">Não é possível desativar a própria conta durante esta sessão.</small>}</div>}
      {!editingUser && <div className="user-password-fields"><h3>Acesso ao workspace</h3><p>Defina a senha que a pessoa usará para entrar. Use ao menos 12 caracteres.</p><div className="form-field"><label htmlFor="new-user-password">Senha <em>*</em></label><input id="new-user-password" type="password" autoComplete="new-password" maxLength={128} value={passwordForm.password} onChange={(event) => setPasswordForm({ ...passwordForm, password: event.target.value })} /></div><div className="form-field"><label htmlFor="new-user-password-confirm">Confirmação da senha <em>*</em></label><input id="new-user-password-confirm" type="password" autoComplete="new-password" maxLength={128} value={passwordForm.confirmation} onChange={(event) => setPasswordForm({ ...passwordForm, confirmation: event.target.value })} /></div></div>}
      <div className="modal-actions"><button className="button secondary" onClick={() => setUserModal(false)}>Cancelar</button><button className="button primary" onClick={() => void saveUser()}>{editingUser ? "Salvar alterações" : "Adicionar usuário"}</button></div>
      {editingUser && <section className="password-reset-section"><h3>Redefinir senha</h3><p>A pessoa precisará entrar novamente com a nova senha.</p><div className="form-field"><label htmlFor="reset-user-password">Senha <em>*</em></label><input id="reset-user-password" type="password" autoComplete="new-password" maxLength={128} value={passwordForm.password} onChange={(event) => setPasswordForm({ ...passwordForm, password: event.target.value })} /></div><div className="form-field"><label htmlFor="reset-user-password-confirm">Confirmação da senha <em>*</em></label><input id="reset-user-password-confirm" type="password" autoComplete="new-password" maxLength={128} value={passwordForm.confirmation} onChange={(event) => setPasswordForm({ ...passwordForm, confirmation: event.target.value })} /></div><div className="modal-actions"><button className="button secondary" disabled={passwordBusy} onClick={() => setPasswordForm({ password: "", confirmation: "" })}>Limpar</button><button className="button primary" disabled={passwordBusy} onClick={() => void saveUserPassword()}>{passwordBusy ? "Salvando..." : "Redefinir senha"}</button></div></section>}
    </div></div>}

    {taskDetails && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setTaskDetails(null); }}><div className="modal task-detail-modal"><div className="modal-head"><div><div className="eyebrow">TAREFA</div><h2>{taskDetails.title}</h2><p>{taskDetails.project}</p></div><button className="icon-button" aria-label="Fechar" onClick={() => setTaskDetails(null)}><X size={18} /></button></div>
      <div className="detail-grid"><div><span className="detail-label">Status</span><select value={taskDetails.status} onChange={(event) => setTaskDetails({ ...taskDetails, status: event.target.value as TaskStatus })}><option>Pendente</option><option>Em progresso</option><option>Finalizado</option></select></div><div><span className="detail-label">Prioridade</span><select value={taskDetails.priority} onChange={(event) => setTaskDetails({ ...taskDetails, priority: event.target.value as TaskPriority })}><option>Baixa</option><option>Média</option><option>Alta</option><option>Urgente</option></select></div><div><span className="detail-label">Prazo</span><input type="date" value={taskDetails.dueDate ?? ""} onChange={(event) => setTaskDetails({ ...taskDetails, dueDate: event.target.value || null })} /></div><div><span className="detail-label">Etapas concluídas</span><strong>{taskDetails.checklist.filter((item) => item.completed).length}/{taskDetails.checklist.length}</strong></div></div>
      <div className="detail-section"><h3>Descrição</h3><textarea className="detail-description-input" value={taskDetails.description} onChange={(event) => setTaskDetails({ ...taskDetails, description: event.target.value })} placeholder="Adicione uma descrição para esta tarefa." /></div>
      <div className="detail-section"><h3>Responsáveis</h3><AssigneeOptions users={users} selected={taskDetails.assigneeIds} onChange={(assigneeIds) => setTaskDetails({ ...taskDetails, assigneeIds, assignees: users.filter((user) => assigneeIds.includes(user.id)), owner: users.filter((user) => assigneeIds.includes(user.id)).map((user) => user.name).join(", ") || "Sem responsável", initials: users.find((user) => assigneeIds.includes(user.id))?.initials ?? "--" })} /></div>
      <div className="detail-section"><h3>Tags</h3><TagEditor tags={taskDetails.tags} onChange={(tags) => setTaskDetails({ ...taskDetails, tags })} /></div>
      <div className="detail-section"><h3>Checklist</h3>{taskDetails.checklist.map((item) => <label className="checklist-row checklist-interactive" key={item.id}><input type="checkbox" checked={item.completed} onChange={(event) => setTaskDetails({ ...taskDetails, checklist: taskDetails.checklist.map((entry) => entry.id === item.id ? { ...entry, completed: event.target.checked } : entry) })} /><span className={item.completed ? "checklist-complete" : ""}>{item.title}</span></label>)}{taskDetails.checklist.length === 0 && <p className="muted">Nenhuma etapa adicionada.</p>}<div className="checklist-add"><input value={checklistDraft} onChange={(event) => setChecklistDraft(event.target.value)} placeholder="Nova etapa do checklist" /><button className="button secondary small" onClick={() => { if (!checklistDraft.trim()) return; setTaskDetails({ ...taskDetails, checklist: [...taskDetails.checklist, { id: crypto.randomUUID(), title: checklistDraft.trim(), completed: false }] }); setChecklistDraft(""); }}>Adicionar</button></div></div>
      <div className="modal-actions"><button className="button secondary" onClick={() => setTaskDetails(null)}>Cancelar</button><button className="button primary" onClick={() => void saveTask(taskDetails)}><Check size={16} /> Salvar alterações</button></div>
    </div></div>}
    {toast && <div className="toast"><Check size={18} />{toast}</div>}
    <div className="demo-note"><span className="demo-pulse" />{loading ? "Conectando ao banco" : `PostgreSQL · ${provider === "local" ? "local" : "Supabase"}`}</div>
  </div>;
}

function AssigneeOptions({ users, selected, onChange }: { users: User[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const available = users.filter((user) => user.status === "Ativo");
  if (!available.length) return <span className="muted">Nenhum usuário ativo cadastrado.</span>;
  return <div className="assignee-options" role="group" aria-label="Selecionar responsáveis">{available.map((user) => {
    const isSelected = selected.includes(user.id);
    return <label className={`assignee-option${isSelected ? " is-selected" : ""}`} key={user.id}><input type="checkbox" checked={isSelected} onChange={(event) => onChange(event.target.checked ? [...selected, user.id] : selected.filter((id) => id !== user.id))} /><span className={`avatar avatar-${user.color}`}>{user.initials}</span><span className="assignee-name">{user.name}</span>{isSelected && <span className="assignee-selected-indicator" aria-hidden="true"><Check size={13} /></span>}</label>;
  })}</div>;
}

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const normalizedDraft = draft.trim();
  const duplicate = normalizedDraft.length > 0 && tags.some((tag) => tag.toLocaleLowerCase("pt-BR") === normalizedDraft.toLocaleLowerCase("pt-BR"));
  const canAdd = normalizedDraft.length > 0 && normalizedDraft.length <= 40 && !duplicate && tags.length < 30;

  const addTag = () => {
    if (!canAdd) return;
    onChange([...tags, normalizedDraft]);
    setDraft("");
  };

  const hint = tags.length >= 30
    ? "Limite de 30 tags atingido."
    : duplicate
      ? "Esta tag já foi adicionada."
      : "Digite uma tag e pressione Enter ou selecione Adicionar.";

  return <div className="tag-editor">
    <div className="tag-editor-entry">
      <input aria-label="Nova tag" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(); } }} maxLength={40} placeholder="Digite o nome da tag" />
      <button className="button secondary small tag-editor-add" type="button" disabled={!canAdd} onClick={addTag}><Plus size={13} /> Adicionar</button>
    </div>
    {tags.length > 0 && <div className="tag-editor-list" aria-label="Tags adicionadas">{tags.map((tag) => <span className="tag-editor-chip" key={tag}><span>{tag}</span><button type="button" aria-label={`Remover tag ${tag}`} title={`Remover tag ${tag}`} onClick={() => onChange(tags.filter((item) => item !== tag))}><X size={12} /></button></span>)}</div>}
    <small className="tag-editor-hint">{hint}</small>
  </div>;
}

function Dashboard({ userName, tasks, taskTrends, recentActivity, projectCount, taskCount, pendingCount, doneCount, onNewTask, onNewProject, onPage, onTask }: { userName: string; tasks: Task[]; taskTrends: TaskTrend[]; recentActivity: TaskActivity[]; projectCount: number; taskCount: number; pendingCount: number; doneCount: number; onNewTask: () => void; onNewProject: () => void; onPage: (page: string) => void; onTask: (task: Task) => void }) {
  const inProgress = tasks.filter((task) => task.status === "Em progresso").length;
  const maxChartValue = Math.max(4, Math.ceil(Math.max(0, ...taskTrends.flatMap((day) => [day.created, day.completed])) / 4) * 4);
  const axisLabels = [maxChartValue, maxChartValue * 0.75, maxChartValue * 0.5, maxChartValue * 0.25, 0];
  const hasChartActivity = taskTrends.some((day) => day.created > 0 || day.completed > 0);
  return <div className="page-stack">
    <div className="page-heading"><div><div className="eyebrow">VISÃO GERAL DO WORKSPACE</div><h1>Bom dia, {userName.split(/\s+/)[0]} <span className="wave">✦</span></h1><p>Aqui está o resumo do que está acontecendo no seu workspace.</p></div><div className="heading-actions"><button className="button secondary" onClick={onNewProject}><Plus size={16} /> Novo projeto</button><button className="button primary" onClick={onNewTask}><Plus size={16} /> Nova tarefa</button></div></div>
    <div className="metric-grid"><Metric title="Total de projetos" value={String(projectCount).padStart(2, "0")} change="Projetos cadastrados" trend="up" icon={<FolderKanban size={19} />} tone="purple" onClick={() => onPage("Projetos")} /><Metric title="Total de tarefas" value={String(taskCount).padStart(2, "0")} change="Tarefas cadastradas" trend="up" icon={<ClipboardList size={19} />} tone="blue" onClick={() => onPage("Quadro Kanban")} /><Metric title="Tarefas pendentes" value={String(pendingCount).padStart(2, "0")} change="Precisam de atenção" trend="neutral" icon={<Clock3 size={19} />} tone="amber" onClick={() => onPage("Quadro Kanban")} /><Metric title="Tarefas concluídas" value={String(doneCount).padStart(2, "0")} change={`${Math.round(doneCount / Math.max(taskCount, 1) * 100)}% das tarefas`} trend="up" icon={<CheckCheck size={19} />} tone="green" onClick={() => onPage("Quadro Kanban")} /></div>
    <div className="dashboard-grid">
      <section className="panel progress-panel"><div className="panel-heading"><div><h2>Visão geral das tarefas</h2><p>Criações e conclusões registradas por dia</p></div><span className="select-button chart-period">Últimos 7 dias</span></div><div className="chart-area"><div className="y-axis">{axisLabels.map((value, index) => <span key={index}>{value}</span>)}</div><div className="chart-main"><div className="chart-gridlines"><i /><i /><i /><i /><i /></div><div className="bar-chart">{taskTrends.map((value) => <div className="bar-group" key={value.date}><div className="bars"><span className="bar created" title={`${value.created} tarefa(s) criada(s)`} style={{ height: `${value.created / maxChartValue * 100}%`, minHeight: value.created ? 4 : 0 }} /><span className="bar completed" title={`${value.completed} tarefa(s) concluída(s)`} style={{ height: `${value.completed / maxChartValue * 100}%`, minHeight: value.completed ? 4 : 0 }} /></div><span className="bar-label">{taskActivityDateLabel(value.date)}</span></div>)}</div></div></div><div className="chart-legend"><span><i className="legend-dot created-dot" /> Tarefas criadas</span><span><i className="legend-dot completed-dot" /> Tarefas concluídas</span><span className="chart-note">{hasChartActivity ? "Dados reais do workspace" : "Sem movimentação nos últimos 7 dias"}</span></div></section>
      <section className="panel status-panel"><div className="panel-heading"><div><h2>Status das tarefas</h2><p>Distribuição atual</p></div><button className="icon-button" aria-label="Abrir Kanban" onClick={() => onPage("Quadro Kanban")}><Ellipsis size={19} /></button></div><div className="donut-wrap"><div className="donut"><div className="donut-center"><strong>{taskCount}</strong><span>tarefas</span></div></div></div><div className="status-legend"><div><span><i className="status-dot pending-dot" /> Pendente</span><strong>{pendingCount}</strong></div><div><span><i className="status-dot progress-dot" /> Em progresso</span><strong>{inProgress}</strong></div><div><span><i className="status-dot done-dot" /> Finalizado</span><strong>{doneCount}</strong></div></div></section>
    </div>
    <div className="lower-grid"><section className="panel tasks-panel"><div className="panel-heading"><div><h2>Tarefas recentes</h2><p>Atividades que merecem sua atenção</p></div><button className="text-button" onClick={() => onPage("Quadro Kanban")}>Ver todas <ChevronRight size={15} /></button></div><div className="recent-list">{tasks.slice(0, 4).map((task) => <button className="recent-task" key={task.id} onClick={() => onTask(task)}><span className={`task-status-icon ${task.status === "Finalizado" ? "is-done" : task.status === "Em progresso" ? "is-progress" : ""}`}>{task.status === "Finalizado" ? <Check size={14} /> : task.status === "Em progresso" ? <Activity size={14} /> : <Circle size={13} />}</span><span className="recent-task-main"><strong>{task.title}</strong><small>{task.project}</small></span><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span><span className="recent-due"><CalendarDays size={13} />{taskDateLabel(task.dueDate)}</span></button>)}</div></section>
      <section className="panel activity-panel"><div className="panel-heading"><div><h2>Atividade recente</h2><p>Últimas alterações de tarefas registradas</p></div><button className="icon-button" aria-label="Abrir quadro Kanban" onClick={() => onPage("Quadro Kanban")}><Ellipsis size={19} /></button></div><div className="activity-list">{recentActivity.map((activity) => <ActivityItem key={activity.id} initials={activity.actorInitials || "--"} color={activity.actorColor} title={taskActivityLabel(activity)} detail={`${activity.taskTitle} · ${activity.projectName}`} time={taskActivityTime(activity.occurredAt)} />)}{recentActivity.length === 0 && <div className="activity-empty">Nenhuma atividade de tarefa registrada ainda.</div>}</div></section>
    </div>
    <div className="tip-banner"><div className="tip-icon"><Sparkles size={19} /></div><div><strong>Um bom projeto começa com clareza.</strong><p>Organize as próximas entregas no Kanban e mantenha todos na mesma página.</p></div><button className="text-button" onClick={() => onPage("Quadro Kanban")}>Abrir Kanban <ArrowUpRight size={15} /></button></div>
  </div>;
}

function Metric({ title, value, change, trend, icon, tone, onClick }: { title: string; value: string; change: string; trend: string; icon: React.ReactNode; tone: string; onClick: () => void }) {
  return <button className="metric-card" onClick={onClick}><div className="metric-top"><span className={`metric-icon ${tone}`}>{icon}</span><span className="metric-more"><ArrowUpRight size={15} /></span></div><div className="metric-value">{value}</div><div className="metric-title">{title}</div><div className={`metric-change ${trend === "up" ? "positive" : trend === "neutral" ? "neutral" : ""}`}>{trend === "up" ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {change}</div></button>;
}

function ActivityItem({ initials, color, title, detail, time }: { initials: string; color: string; title: string; detail: string; time: string }) {
  return <div className="activity-item"><div className={`avatar avatar-${color}`}>{initials}</div><div className="activity-copy"><strong>{title}</strong><span>{detail}</span><small>{time}</small></div></div>;
}

function ProjectsView({ projects, selected, search, onSelect, onNew, onOpenProject }: { projects: Project[]; selected: string; search: string; onSelect: (name: string) => void; onNew: () => void; onOpenProject: (name: string) => void }) {
  const [view, setView] = useState<"cards" | "table">("cards");
  const [filter, setFilter] = useState("Todos");
  const filtered = projects.filter((project) => (filter === "Todos" || project.status === filter)
    && (selected === "Todos os projetos" || project.name === selected)
    && project.name.toLowerCase().includes(search.trim().toLowerCase()));
  return <div className="page-stack"><div className="page-heading"><div><div className="eyebrow">ORGANIZAÇÃO E ACOMPANHAMENTO</div><h1>Projetos</h1><p>Gerencie iniciativas, acompanhe entregas e mantenha a equipe alinhada.</p></div><button className="button primary" onClick={onNew}><Plus size={16} /> Novo projeto</button></div><div className="toolbar"><div className="filter-pills">{["Todos", "Ativo", "Concluído"].map((status) => <button className={filter === status ? "selected" : ""} key={status} onClick={() => setFilter(status)}>{status}<span>{status === "Todos" ? projects.length : projects.filter((project) => project.status === status).length}</span></button>)}</div><div className="toolbar-right"><button className="select-button" onClick={() => onSelect("Todos os projetos")}><ListFilter size={14} /> {selected === "Todos os projetos" ? "Todos os projetos" : selected}<ChevronDown size={14} /></button><div className="view-toggle"><button className={view === "cards" ? "active" : ""} onClick={() => setView("cards")} aria-label="Visualização em cards"><div className="grid-glyph" /></button><button className={view === "table" ? "active" : ""} onClick={() => setView("table")} aria-label="Visualização em tabela"><ClipboardList size={16} /></button></div></div></div>
    {view === "cards" ? <div className="project-grid">{filtered.map((project) => <article className="project-card" key={project.id}><div className="project-card-top"><div className={`project-symbol ${project.color}`}><FolderKanban size={20} /></div><button className="icon-button" aria-label="Mais opções"><MoreHorizontal size={18} /></button></div><div className="project-card-title"><h3>{project.name}</h3><span className={`status-pill ${project.status === "Concluído" ? "complete" : "active"}`}><i />{project.status}</span></div><p className="project-description">{project.desc}</p><div className="project-progress-label"><span>Progresso</span><strong>{project.progress}%</strong></div><div className="progress-track"><span style={{ width: `${project.progress}%` }} className={project.color} /></div><div className="project-card-meta"><span><ClipboardList size={14} />{project.tasks} tarefas</span><span><CalendarDays size={14} />{projectDateLabel(project.dueDate)}</span></div><div className="project-card-bottom"><div className="avatar-stack">{project.initials.map((initials, index) => <span key={`${project.id}-${initials}`} className={`avatar-stack-item stack-${index}`}>{initials}</span>)}</div><button className="button small secondary" onClick={() => onOpenProject(project.name)}>Abrir projeto <ArrowUpRight size={14} /></button></div></article>)}</div> : <div className="panel table-panel"><table><thead><tr><th>Projeto</th><th>Situação</th><th>Tarefas</th><th>Progresso</th><th>Prazo final</th><th /></tr></thead><tbody>{filtered.map((project) => <tr key={project.id}><td><strong>{project.name}</strong><small>{project.desc}</small></td><td><span className={`status-pill ${project.status === "Concluído" ? "complete" : "active"}`}><i />{project.status}</span></td><td>{project.tasks}</td><td><div className="table-progress"><div className="progress-track"><span style={{ width: `${project.progress}%` }} /></div>{project.progress}%</div></td><td>{projectDateLabel(project.dueDate)}</td><td><button className="icon-button" aria-label={`Abrir ${project.name}`} onClick={() => onOpenProject(project.name)}><ChevronRight size={17} /></button></td></tr>)}</tbody></table></div>}
    {filtered.length === 0 && <div className="empty-state"><FolderKanban size={28} /><strong>Nenhum projeto encontrado</strong><span>Experimente alterar os filtros ou crie um novo projeto.</span><button className="button primary" onClick={onNew}><Plus size={16} /> Novo projeto</button></div>}<div className="page-footnote"><span>{filtered.length} projetos exibidos</span><span>{search ? `Filtro por nome: “${search}”` : "Dados salvos no banco selecionado"}</span></div></div>;
}

function KanbanView({ tasks, onMove, onTask, onNew, project }: { tasks: Task[]; onMove: (task: Task, status: TaskStatus) => void; onTask: (task: Task) => void; onNew: () => void; project: string }) {
  const [filter, setFilter] = useState("Todos");
  const [query, setQuery] = useState("");
  const columns: TaskStatus[] = ["Pendente", "Em progresso", "Finalizado"];
  const matches = tasks.filter((task) => (filter === "Todos" || task.priority === filter) && (task.title + " " + task.owner + " " + task.tags.join(" ")).toLowerCase().includes(query.toLowerCase()));
  const colorFor = (status: TaskStatus) => status === "Pendente" ? "pending" : status === "Em progresso" ? "progress" : "done";
  return <div className="page-stack"><div className="page-heading"><div><div className="eyebrow">PROJETO / QUADRO DE TRABALHO</div><h1>{project === "Todos os projetos" ? "Quadro Kanban" : project}</h1><p>Visualize o fluxo de trabalho e mova as tarefas entre etapas.</p></div><button className="button primary" onClick={onNew}><Plus size={16} /> Nova tarefa</button></div><div className="kanban-toolbar"><div className="search-box kanban-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar tarefa..." /></div><select className="select-button" value={filter} onChange={(event) => setFilter(event.target.value)}><option>Todos</option><option>Urgente</option><option>Alta</option><option>Média</option><option>Baixa</option></select><button className="button secondary" onClick={() => { setFilter("Todos"); setQuery(""); }}><SlidersHorizontal size={15} /> Limpar filtros</button></div><div className="kanban-board">{columns.map((column) => <section className="kanban-column" key={column}><div className="kanban-column-head"><div className={`column-marker ${colorFor(column)}`} /><h2>{column}</h2><span className="column-count">{matches.filter((task) => task.status === column).length}</span><button className="tiny-icon" aria-label="Nova tarefa" onClick={onNew}><Plus size={16} /></button></div><div className="kanban-cards">{matches.filter((task) => task.status === column).map((task) => <article className="kanban-card" key={task.id} onClick={() => onTask(task)}><div className="kanban-card-top"><span className={`priority-dot ${task.priority.toLowerCase()}`} /><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span><button className="tiny-icon" aria-label={`Editar ${task.title}`} onClick={(event) => { event.stopPropagation(); onTask(task); }}><MoreHorizontal size={16} /></button></div><h3>{task.title}</h3><p>{task.project}</p><div className="tag-row">{task.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div><div className="kanban-card-bottom"><div className="mini-owner"><span className="avatar avatar-purple">{task.initials}</span><span>{task.owner}</span></div><span className={`due ${taskDateLabel(task.dueDate) === "Hoje" ? "due-today" : ""}`}><CalendarDays size={13} />{taskDateLabel(task.dueDate)}</span></div>{task.checklist.length > 0 && <div className="checklist-progress"><CheckCheck size={13} />{task.checklist.filter((item) => item.completed).length}/{task.checklist.length} etapas</div>}<div className="card-move-controls"><span>Mover para:</span>{columns.filter((status) => status !== column).map((status) => <button key={status} onClick={(event) => { event.stopPropagation(); void onMove(task, status); }}>{status}</button>)}</div></article>)}{matches.filter((task) => task.status === column).length === 0 && <div className="column-empty">Nenhuma tarefa nesta etapa</div>}</div><button className="add-task-inline" onClick={onNew}><Plus size={15} /> Adicionar tarefa</button></section>)}</div><div className="page-footnote"><span>{matches.length} tarefas no quadro</span><span>Use os controles de movimentação para alterar o status</span></div></div>;
}

function UsersView({ users, onNew, onEdit }: { users: User[]; onNew: () => void; onEdit: (user: User) => void }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");
  const filtered = users.filter((user) => (user.name + " " + (user.email ?? "") + " " + user.jobTitle + " " + user.accessRole).toLowerCase().includes(search.toLowerCase()) && (filter === "Todos" || user.status === filter));
  return <div className="page-stack"><div className="page-heading"><div><div className="eyebrow">EQUIPE E ACESSOS</div><h1>Usuários</h1><p>Gerencie os membros, seus papéis e o acesso ao workspace.</p></div><button className="button primary" onClick={onNew}><Plus size={16} /> Adicionar usuário</button></div><div className="toolbar"><div className="search-box user-search"><Search size={15} /><input aria-label="Buscar usuários" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou e-mail" /></div><div className="toolbar-right"><select className="select-button" value={filter} onChange={(event) => setFilter(event.target.value)}><option>Todos</option><option>Ativo</option><option>Inativo</option></select><button className="button secondary" onClick={() => { setFilter("Todos"); setSearch(""); }}><SlidersHorizontal size={15} /> Limpar filtros</button></div></div><div className="panel table-panel"><table><thead><tr><th>Usuário</th><th>Perfil de acesso</th><th>Situação</th><th>Acesso</th><th>Última atividade</th><th /></tr></thead><tbody>{filtered.map((user) => <tr key={user.id}><td><div className="user-cell"><div className={`avatar avatar-${user.color}`}>{user.initials}</div><div><strong>{user.name}</strong><small>{user.email || "Sem e-mail"}</small><small>{[user.jobTitle, user.phone].filter(Boolean).join(" · ")}</small></div></div></td><td><span className="role-pill">{user.accessRole}</span></td><td><span className={`status-pill ${user.status === "Ativo" ? "active" : "inactive"}`}><i />{user.status}</span></td><td><span className={`status-pill ${user.status === "Ativo" && user.hasAccess ? "active" : "inactive"}`}><i />{user.status === "Inativo" ? "Desativado" : user.hasAccess ? "Habilitado" : "Senha pendente"}</span></td><td className="muted">—</td><td><button className="icon-button" onClick={() => onEdit(user)} title="Editar dados, situação e senha do usuário" aria-label={`Editar ${user.name}`}><MoreHorizontal size={18} /></button></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state"><UsersIcon size={26} /><strong>Nenhum usuário encontrado</strong></div>}</div><div className="page-footnote"><span>{filtered.length} de {users.length} usuários</span><span>Cadastro do workspace</span></div></div>;
}

function SettingsView({ user, saved, theme, onTheme, onSaveProfile, onSavePreferences }: { user: User | null; saved: boolean; theme: ThemePreference; onTheme: (theme: ThemePreference) => void; onSaveProfile: (profile: Pick<User, "name" | "email" | "jobTitle" | "phone">) => Promise<void>; onSavePreferences: () => void }) {
  const [section, setSection] = useState("Perfil");
  const [profile, setProfile] = useState({ name: "", email: "", jobTitle: "", phone: "" });
  useEffect(() => { setProfile({ name: user?.name ?? "", email: user?.email ?? "", jobTitle: user?.jobTitle ?? "", phone: user?.phone ?? "" }); }, [user]);
  return <div className="page-stack">
    <div className="page-heading"><div><div className="eyebrow">PREFERÊNCIAS DO WORKSPACE</div><h1>Configurações</h1><p>Personalize sua experiência e gerencie os dados da sua conta.</p></div></div>
    <div className="settings-layout">
      <aside className="settings-nav panel">{["Perfil", "Preferências", "Segurança"].map((item) => <button key={item} className={section === item ? "active" : ""} onClick={() => setSection(item)}>{item === "Perfil" ? <UsersIcon size={17} /> : item === "Preferências" ? <Settings2 size={17} /> : <Zap size={17} />} {item}</button>)}</aside>
      <section className="panel settings-panel">
        <div className="settings-title"><h2>{section === "Perfil" ? "Informações do perfil" : section === "Preferências" ? "Preferências da interface" : "Segurança da conta"}</h2><p>{section === "Perfil" ? "Atualize suas informações pessoais e como elas aparecem para a equipe." : section === "Preferências" ? "Configure a aparência e as opções de uso do workspace." : "Consulte como solicitar a redefinição de senha da sua conta."}</p></div>
        {section === "Perfil" ? <>
          <div className="profile-edit"><div className={`avatar avatar-${user?.color ?? "purple"} avatar-large`}>{user?.initials ?? "AA"}</div><div><strong>Foto do perfil</strong><p>JPG ou PNG. Recomendado: 256 × 256 px.</p><button className="button secondary small" onClick={() => undefined}>Alterar foto</button></div></div>
          <div className="settings-form-grid"><div className="form-field"><label>Nome completo</label><input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></div><div className="form-field"><label>E-mail</label><input value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} type="email" required={Boolean(user?.hasAccess)} /></div><div className="form-field"><label>Cargo</label><input value={profile.jobTitle} onChange={(event) => setProfile({ ...profile, jobTitle: event.target.value })} /></div><div className="form-field"><label>Telefone</label><input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} type="tel" placeholder="(00) 00000-0000" /></div></div>
        </> : section === "Preferências" ? <>
          <div className="preference-row"><div><strong>Tema da interface</strong><p>Escolha a aparência do workspace.</p></div><select value={theme} onChange={(event) => onTheme(event.target.value as ThemePreference)}><option>Claro</option><option>Escuro</option><option>Sistema</option></select></div>
          <div className="preference-row"><div><strong>Formato de data</strong><p>Como as datas serão exibidas.</p></div><select defaultValue="DD/MM/AAAA"><option>DD/MM/AAAA</option><option>AAAA-MM-DD</option></select></div>
          <div className="preference-row"><div><strong>Notificações por e-mail</strong><p>Receba atualizações sobre suas tarefas.</p></div><input type="checkbox" defaultChecked className="check-input" /></div>
        </> : <div className="security-placeholder"><div className="security-icon"><Zap size={22} /></div><h3>Senha administrada pelo site</h3><p>Um administrador pode redefinir sua senha na aba Usuários. A tela de login não oferece recuperação automática.</p><span className="status-pill active"><i />Autenticação ativa</span></div>}
        {section !== "Segurança" && <div className="settings-actions"><span>{saved ? "Alterações salvas." : "As alterações ainda não foram salvas."}</span><button className="button primary" onClick={() => { if (section === "Perfil") void onSaveProfile(profile); else onSavePreferences(); }}><Check size={16} /> Salvar alterações</button></div>}
      </section>
    </div>
  </div>;
}
