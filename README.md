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

Acesse http://localhost:3000.

A interface inicial abre no Dashboard. Em desenvolvimento, projetos, tarefas e usuários persistem no PostgreSQL selecionado. **A aplicação ainda não inclui autenticação e não está pronta para produção.**

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
npm run dev
```

Por padrão, a conexão é `postgresql://postgres:postgres@localhost:5432/postgres`. As tabelas do Nexo ficam isoladas no schema `nexo`. Para usar outro servidor local, altere `LOCAL_DATABASE_URL`.

Para usar o Supabase, copie a connection string em **Database → Connect**, preencha `SUPABASE_DATABASE_URL` e altere `DATABASE_PROVIDER` para `supabase`. Aplique `npm run db:migrate` no banco escolhido; execute `npm run db:seed` somente se quiser carregar dados demonstrativos. Um banco fica ativo por vez e não há sincronização automática. A URL fica somente no servidor.

As rotas sem autenticação ficam bloqueadas fora do modo de desenvolvimento. Configure autenticação e autorização antes de publicar a aplicação com acesso a dados reais.

## Estado atual

Implementado nesta etapa:
- Dashboard responsivo com cards, gráficos ilustrativos, tarefas recentes e atividades demonstrativas.
- Navegação lateral responsiva entre Dashboard, Projetos, Quadro Kanban, Usuários e Configurações.
- Listagem de projetos em cards/tabela e filtros de situação.
- Quadro Kanban com controles explícitos para mover tarefas entre colunas.
- Modais de criação de tarefa, projeto e usuário (demonstração local).
- Painel de detalhes da tarefa, configurações de perfil e preferências.
- Busca, filtros, feedback toast e estados vazios.

Ainda pendente:
- Autenticação e autorização real.
- Sincronização de dados entre provedores.
- Upload privado no Supabase Storage.
- Drag-and-drop real com dnd-kit (o pacote está incluído; esta primeira etapa usa controles acessíveis para mudança de status).
- Logs de auditoria persistidos, testes automatizados e validação de build no ambiente de entrega.

Não utilize dados exibidos na prévia como dados reais de produção.
