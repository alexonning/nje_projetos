INSERT INTO nexo.workspace_users (id, name, email, job_title, access_role, status, initials, color)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'Alex Abatti', 'alex@workspace.dev', 'Administrador', 'Administrador', 'Ativo', 'AA', 'purple'),
  ('00000000-0000-4000-8000-000000000002', 'Marina Costa', 'marina@workspace.dev', 'Gerente de projetos', 'Gerente de projetos', 'Ativo', 'MC', 'pink'),
  ('00000000-0000-4000-8000-000000000003', 'Rafael Lima', 'rafael@workspace.dev', 'Colaborador', 'Colaborador', 'Ativo', 'RL', 'blue'),
  ('00000000-0000-4000-8000-000000000004', 'Camila Souza', 'camila@workspace.dev', 'Colaboradora', 'Colaborador', 'Inativo', 'CS', 'green')
ON CONFLICT (email) DO NOTHING;

INSERT INTO nexo.projects (id, name, description, status, progress, due_date, color)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'Redesign da plataforma', 'Modernização da experiência digital', 'Ativo', 68, '2026-10-31', 'violet'),
  ('10000000-0000-4000-8000-000000000002', 'API de integrações', 'Unificação dos serviços e integrações', 'Ativo', 42, '2026-11-08', 'blue'),
  ('10000000-0000-4000-8000-000000000003', 'Portal do cliente', 'Área de autoatendimento para clientes', 'Ativo', 84, '2026-10-25', 'orange'),
  ('10000000-0000-4000-8000-000000000004', 'Automação de processos', 'Otimização de rotinas operacionais', 'Concluído', 100, '2026-10-15', 'green')
ON CONFLICT (name) DO NOTHING;

INSERT INTO nexo.tasks (id, project_id, title, description, status, priority, due_date)
SELECT seed.id, p.id, seed.title, seed.description, seed.status, seed.priority, seed.due_date
FROM (VALUES
  ('20000000-0000-4000-8000-000000000001'::uuid, 'Redesign da plataforma', 'Mapear jornada do usuário', 'Levantar necessidades e pontos de atrito da jornada atual.', 'Pendente', 'Alta', '2026-10-23'::date),
  ('20000000-0000-4000-8000-000000000002'::uuid, 'Portal do cliente', 'Criar componentes de formulário', 'Implementar os componentes reutilizáveis de formulários.', 'Pendente', 'Média', '2026-10-24'::date),
  ('20000000-0000-4000-8000-000000000003'::uuid, 'API de integrações', 'Revisar arquitetura da API', 'Revisar contratos e estrutura da API de integrações.', 'Em progresso', 'Urgente', '2026-10-21'::date),
  ('20000000-0000-4000-8000-000000000004'::uuid, 'API de integrações', 'Documentar endpoints', 'Documentar endpoints e exemplos de uso.', 'Em progresso', 'Média', '2026-10-25'::date),
  ('20000000-0000-4000-8000-000000000005'::uuid, 'Redesign da plataforma', 'Ajustar responsividade mobile', 'Validar experiência em telas menores.', 'Finalizado', 'Baixa', '2026-10-20'::date),
  ('20000000-0000-4000-8000-000000000006'::uuid, 'Portal do cliente', 'Configurar pipeline CI/CD', 'Configurar automação de integração e entrega contínuas.', 'Finalizado', 'Alta', '2026-10-19'::date)
) AS seed(id, project_name, title, description, status, priority, due_date)
JOIN nexo.projects p ON p.name = seed.project_name
ON CONFLICT (id) DO NOTHING;

INSERT INTO nexo.task_assignees (task_id, user_id)
SELECT mapping.task_id, u.id
FROM (VALUES
  ('20000000-0000-4000-8000-000000000001'::uuid, 'marina@workspace.dev'),
  ('20000000-0000-4000-8000-000000000002'::uuid, 'rafael@workspace.dev'),
  ('20000000-0000-4000-8000-000000000003'::uuid, 'alex@workspace.dev'),
  ('20000000-0000-4000-8000-000000000004'::uuid, 'marina@workspace.dev'),
  ('20000000-0000-4000-8000-000000000005'::uuid, 'rafael@workspace.dev'),
  ('20000000-0000-4000-8000-000000000006'::uuid, 'alex@workspace.dev')
) AS mapping(task_id, email)
JOIN nexo.workspace_users u ON u.email = mapping.email
ON CONFLICT DO NOTHING;

INSERT INTO nexo.tags (name)
VALUES ('UX'), ('Pesquisa'), ('Frontend'), ('Backend'), ('API'), ('Documentação'), ('UI'), ('DevOps')
ON CONFLICT (name) DO NOTHING;

INSERT INTO nexo.task_tags (task_id, tag_id)
SELECT mapping.task_id, tag.id
FROM (VALUES
  ('20000000-0000-4000-8000-000000000001'::uuid, 'UX'), ('20000000-0000-4000-8000-000000000001'::uuid, 'Pesquisa'),
  ('20000000-0000-4000-8000-000000000002'::uuid, 'Frontend'),
  ('20000000-0000-4000-8000-000000000003'::uuid, 'Backend'), ('20000000-0000-4000-8000-000000000003'::uuid, 'API'),
  ('20000000-0000-4000-8000-000000000004'::uuid, 'Documentação'),
  ('20000000-0000-4000-8000-000000000005'::uuid, 'Frontend'), ('20000000-0000-4000-8000-000000000005'::uuid, 'UI'),
  ('20000000-0000-4000-8000-000000000006'::uuid, 'DevOps')
) AS mapping(task_id, tag_name)
JOIN nexo.tags tag ON tag.name = mapping.tag_name
ON CONFLICT DO NOTHING;

INSERT INTO nexo.task_checklist_items (id, task_id, title, position, is_completed)
VALUES
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Definir público e cenários', 1, true),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'Entrevistar usuários', 2, true),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'Mapear pontos de atrito', 3, false),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'Validar jornada proposta', 4, false),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', 'Publicar documentação', 5, false),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000003', 'Revisar autenticação', 1, true),
  ('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000003', 'Revisar versionamento', 2, true),
  ('30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000003', 'Validar documentação', 3, true),
  ('30000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000003', 'Revisar limites', 4, false)
ON CONFLICT (id) DO NOTHING;
