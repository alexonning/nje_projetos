# PostgreSQL Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir projetos, tarefas e usuários em PostgreSQL local ou Supabase selecionável por ambiente, corrigindo os fluxos solicitados sem redesenhar a interface.

**Architecture:** Route Handlers server-side usam `pg` com uma URL escolhida por `DATABASE_PROVIDER`. Um schema/migration comum alimenta APIs de leitura e escrita; `workspace.tsx` continua a composição visual e passa a consumir essas APIs.

**Tech Stack:** Next.js 15 App Router, TypeScript, PostgreSQL, node-postgres (`pg`), SQL.

**Spec:** `docs/superpowers/specs/2026-10-21-postgres-workspace-design.md`

## Global Constraints

- Credenciais não podem usar `NEXT_PUBLIC_*`.
- `DATABASE_PROVIDER` aceita somente `local` e `supabase`.
- A URL local padrão é `postgresql://postgres:postgres@localhost:5432/postgres`.
- Todas as rotas sem autenticação retornam 403 fora de desenvolvimento.
- Não redesenhar a interface nem sincronizar os dois bancos.

## Review Focus

- URL do banco inválida ou ausente produz erro legível e não expõe credenciais.
- Requisições inválidas não executam SQL com valores concatenados.
- Atualização parcial do status não sobrescreve campos da tarefa.
- Tarefa sem responsável, sem prazo ou sem checklist continua válida.
- Alterar a preferência para “Sistema” acompanha mudanças de `prefers-color-scheme`.

---

### Task 1: Banco, schema e dados locais

**Files:**
- Modify: `package.json`, `.env.example`, `README.md`, `docs/DATABASE.md`
- Create: `.env.local`, `database/schema.sql`, `database/seed.sql`, `scripts/db-migrate.mjs`, `scripts/db-seed.mjs`, `scripts/db-check.mjs`, `src/lib/db.ts`

- [ ] Adicionar `pg` e tipos TypeScript, além dos comandos `db:migrate`, `db:seed` e `db:check`.
- [ ] Criar configuração server-only que selecione URL local/Supabase e limite conexões no modo Supabase.
- [ ] Criar schema idempotente para users, projects, tasks, task_assignees, tags, task_tags e task_checklist_items.
- [ ] Criar seed idempotente dos registros demonstrativos atuais.
- [ ] Configurar `.env.local` com credenciais informadas e atualizar instruções/documentação para troca do banco.
- [ ] Executar migrate, seed e check; confirmar que o banco responde.

### Task 2: APIs server-side

**Files:**
- Create: `src/lib/api-access.ts`, `src/app/api/workspace/route.ts`, `src/app/api/projects/route.ts`, `src/app/api/tasks/route.ts`, `src/app/api/tasks/[id]/route.ts`, `src/app/api/users/route.ts`, `src/app/api/users/[id]/route.ts`

- [ ] Limitar acesso sem autenticação ao ambiente de desenvolvimento.
- [ ] Expor GET agregado do workspace e operações POST/PATCH com SQL parametrizado.
- [ ] Salvar relações de responsáveis, tags e checklist na mesma transação da tarefa.
- [ ] Validar identificadores, enums, datas e campos obrigatórios; retornar erros sem detalhes secretos.
- [ ] Confirmar leitura inicial e CRUD com consultas ao PostgreSQL local.

### Task 3: Conectar a interface e completar cadastros

**Files:**
- Modify: `src/components/workspace.tsx`
- Create: `src/lib/workspace-types.ts`

- [ ] Carregar dados do banco e substituir arrays locais para tarefas, projetos e usuários.
- [ ] Incluir os campos de tarefa e permitir editar/alternar itens reais do checklist.
- [ ] Salvar prazo final do projeto.
- [ ] Incluir cargo e telefone na criação; abrir edição de usuário pelo botão `...`.
- [ ] Reutilizar busca global para nome de projeto, combinada ao status.
- [ ] Preservar estilos, status e navegação existentes.

### Task 4: Tema, documentação e verificação

**Files:**
- Modify: `src/components/workspace.tsx`, `src/app/globals.css`, `README.md`, `docs/DATABASE.md`

- [ ] Aplicar os temas claro, escuro e sistema com persistência local e suporte a mudança do sistema operacional.
- [ ] Documentar criação do banco, comandos, seleção Supabase e restrição de desenvolvimento sem autenticação.
- [ ] Executar lint/build e verificação manual dos fluxos persistidos e das telas nos temas claro/escuro.
