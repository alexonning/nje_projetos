CREATE SCHEMA IF NOT EXISTS nexo;

CREATE TABLE IF NOT EXISTS nexo.workspace_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  job_title text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  access_role text NOT NULL DEFAULT 'Colaborador',
  status text NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
  initials text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'purple',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE nexo.workspace_users ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS workspace_users_email_lower_idx
  ON nexo.workspace_users (lower(email))
  WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS nexo.workspace_credentials (
  user_id uuid PRIMARY KEY REFERENCES nexo.workspace_users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

UPDATE nexo.workspace_users u SET is_demo = true
WHERE (
  (u.id = '00000000-0000-4000-8000-000000000001' AND u.email = 'alex@workspace.dev') OR
  (u.id = '00000000-0000-4000-8000-000000000002' AND u.email = 'marina@workspace.dev') OR
  (u.id = '00000000-0000-4000-8000-000000000003' AND u.email = 'rafael@workspace.dev') OR
  (u.id = '00000000-0000-4000-8000-000000000004' AND u.email = 'camila@workspace.dev')
) AND NOT EXISTS (
  SELECT 1 FROM nexo.workspace_credentials c WHERE c.user_id = u.id
);

CREATE TABLE IF NOT EXISTS nexo.workspace_sessions (
  token_hash char(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES nexo.workspace_users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS workspace_sessions_user_expires_idx
  ON nexo.workspace_sessions(user_id, expires_at);

CREATE TABLE IF NOT EXISTS nexo.workspace_auth_attempts (
  email_hash char(64) PRIMARY KEY,
  failed_attempts integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nexo.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Concluído', 'Inativo')),
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  due_date date,
  color text NOT NULL DEFAULT 'violet',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE nexo.projects ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
UPDATE nexo.projects SET is_demo = true
WHERE id IN (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004'
);

CREATE TABLE IF NOT EXISTS nexo.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES nexo.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em progresso', 'Finalizado')),
  priority text NOT NULL DEFAULT 'Média' CHECK (priority IN ('Urgente', 'Alta', 'Média', 'Baixa')),
  due_date date,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE nexo.tasks ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
UPDATE nexo.tasks SET is_demo = true
WHERE id IN (
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000003',
  '20000000-0000-4000-8000-000000000004',
  '20000000-0000-4000-8000-000000000005',
  '20000000-0000-4000-8000-000000000006'
);

CREATE TABLE IF NOT EXISTS nexo.task_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES nexo.tasks(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES nexo.workspace_users(id) ON DELETE SET NULL,
  actor_name text NOT NULL,
  actor_initials text NOT NULL DEFAULT '',
  actor_color text NOT NULL DEFAULT 'purple',
  event_type text NOT NULL CHECK (event_type IN ('task_created', 'task_updated', 'task_status_changed')),
  task_title text NOT NULL,
  project_name text NOT NULL,
  from_status text,
  to_status text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nexo.task_assignees (
  task_id uuid NOT NULL REFERENCES nexo.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES nexo.workspace_users(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

CREATE TABLE IF NOT EXISTS nexo.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS nexo.task_tags (
  task_id uuid NOT NULL REFERENCES nexo.tasks(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES nexo.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

CREATE TABLE IF NOT EXISTS nexo.task_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES nexo.tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS tasks_project_status_idx ON nexo.tasks(project_id, status);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON nexo.tasks(due_date);
CREATE INDEX IF NOT EXISTS task_activity_occurred_at_idx ON nexo.task_activity(occurred_at DESC);
CREATE INDEX IF NOT EXISTS task_activity_completed_idx ON nexo.task_activity(occurred_at) WHERE event_type = 'task_status_changed' AND to_status = 'Finalizado';
CREATE INDEX IF NOT EXISTS task_assignees_user_idx ON nexo.task_assignees(user_id);
CREATE INDEX IF NOT EXISTS task_tags_tag_idx ON nexo.task_tags(tag_id);
CREATE INDEX IF NOT EXISTS task_checklist_task_position_idx ON nexo.task_checklist_items(task_id, position);

-- Keep the Nexo schema unavailable to direct Data API roles. Server-side
-- application connections use the database owner and enforce workspace auth.
REVOKE ALL ON SCHEMA nexo FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA nexo FROM PUBLIC;

ALTER TABLE nexo.workspace_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexo.workspace_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexo.workspace_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexo.workspace_auth_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexo.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexo.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexo.task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexo.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexo.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexo.task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexo.task_checklist_items ENABLE ROW LEVEL SECURITY;
