# Nexo — Gestão de Projetos

Interface inicial em Next.js App Router, TypeScript e Tailwind CSS para uma plataforma de gestão de projetos, tarefas, usuários e configurações.

## Requisitos

- Node.js 20.9 ou superior
- npm
- PostgreSQL local (usuário e banco `postgres`, porta `5432`)

## Executar localmente

```bash
npm install
npm run dev
```

Acesse http://localhost:3000. O painel exige e-mail e senha; o administrador inicial é criado no passo abaixo.

## Docker

```bash
docker build -t nexo-gestao .
docker run --rm -p 3000:3000 nexo-gestao
```

## Variáveis de ambiente

Copie `.env.example` para `.env.local`. Para iniciar o PostgreSQL local com os dados demonstrativos:

```bash
npm run db:check
npm run db:migrate
npm run db:seed
npm run auth:bootstrap
npm run dev
```

Antes de executar `auth:bootstrap`, preencha em `.env.local` as variáveis `AUTH_BOOTSTRAP_ADMIN_NAME`, `AUTH_BOOTSTRAP_ADMIN_EMAIL` e `AUTH_BOOTSTRAP_ADMIN_PASSWORD`. A senha precisa ter entre 12 e 128 caracteres. O comando cria ou associa o perfil de administrador ao e-mail informado e grava somente o hash da senha. Remova as três variáveis depois do bootstrap. O comando é inicial; ele recusa substituir uma conta de administrador que já tenha credenciais.

Por padrão, a conexão é `postgresql://postgres:postgres@localhost:5432/postgres`. As tabelas do Nexo ficam isoladas no schema `nexo`. Para usar outro servidor local, altere `LOCAL_DATABASE_URL`.

Para usar o Supabase, copie a connection string em **Database → Connect**, preencha `SUPABASE_DATABASE_URL` e altere `DATABASE_PROVIDER` para `supabase`. Aplique `npm run db:migrate` no banco escolhido; execute `npm run db:seed` somente se quiser carregar dados demonstrativos. Um banco fica ativo por vez e não há sincronização automática. A URL fica somente no servidor.

Para produção, configure as variáveis de banco no ambiente do servidor, aplique `node scripts/db-migrate.mjs` e execute `node scripts/auth-bootstrap.mjs` uma única vez com as três variáveis de bootstrap configuradas no ambiente. Remova os segredos de bootstrap após a execução. Nunca exponha essas variáveis ao navegador.

## Estado atual

Implementado nesta etapa:
- Dashboard responsivo com cards, gráficos ilustrativos, tarefas recentes e atividades demonstrativas.
- Navegação lateral responsiva entre Dashboard, Projetos, Quadro Kanban, Usuários e Configurações.
- Listagem de projetos em cards/tabela e filtros de situação.
- Quadro Kanban com controles explícitos para mover tarefas entre colunas.
- Modais de criação de tarefa, projeto e usuário (demonstração local).
- Painel de detalhes da tarefa, configurações de perfil e preferências.
- Busca, filtros, feedback toast e estados vazios.

Autenticação:
- Login por e-mail e senha, sessão persistida no PostgreSQL e logout.
- Criação de contas e redefinição de senhas disponíveis para administradores na aba Usuários.
- Não há cadastro público nem recuperação automática de senha.
- O bootstrap inicial exige configuração explícita de nome, e-mail e senha; não existe senha padrão embutida.

Ainda pendente:
- Sincronização de dados entre provedores.
- Upload privado no Supabase Storage.
- Drag-and-drop real com dnd-kit (o pacote está incluído; esta primeira etapa usa controles acessíveis para mudança de status).
- Logs de auditoria persistidos, testes automatizados e validação de build no ambiente de entrega.

Registros antigos sem credenciais permanecem sem acesso até que o administrador cadastre um e-mail e atribua uma senha pela aba Usuários.
