# Persistência PostgreSQL e correções funcionais

## Objetivo

Conectar a prévia do Nexo a um banco PostgreSQL e completar os fluxos de criação e edição de projetos, tarefas e usuários, sem redesenhar a interface.

## Arquitetura

O aplicativo usa uma única camada PostgreSQL no servidor Next.js. `DATABASE_PROVIDER` escolhe `local` ou `supabase`; cada opção lê sua própria URL de conexão privada. A aplicação usa Route Handlers e consultas parametrizadas com `pg`. Migrações SQL são compartilhadas entre os bancos. Um banco é ativo por vez, sem replicação automática entre eles.

O schema `nexo` contém usuários do workspace, projetos, tarefas, atribuições de tarefas, tags e itens de checklist. O namespace separado evita colisões com tabelas pré-existentes no banco `postgres`. Os dados de perfil e de tarefas persistem no banco. A preferência de tema persiste no navegador, pois a prévia ainda não tem autenticação ou identidade de usuário.

## Requisitos funcionais

- Tarefas podem ser criadas com descrição, múltiplos responsáveis, tags, etapas de checklist e prazo.
- O detalhe da tarefa permite editar esses dados, mudar o status e marcar/desmarcar itens do checklist.
- Projetos podem ser criados com nome, descrição e prazo final.
- Usuários podem ser criados e editados com nome, e-mail, cargo e telefone. O botão de opções da tabela abre a edição.
- A busca existente filtra projetos pelo nome e funciona junto com o filtro por status.
- Claro, escuro e sistema aplicam o tema e mantêm a preferência após recarregar.
- Formulários e filtros preservam o layout atual; apenas controles necessários entram nos modais e a folha de estilos ganha suporte ao tema escuro.

## Segurança e operação

URLs e senhas são lidas exclusivamente no servidor e guardadas em `.env.local`, que já é ignorado pelo Git. O acesso sem autenticação fica limitado ao ambiente de desenvolvimento. O perfil Supabase usa uma URL PostgreSQL fornecida pelo painel e exige TLS; ativação em produção depende de autenticação e autorização.

O banco local padrão usa `postgresql://postgres:postgres@localhost:5432/postgres`. As migrações são aditivas e idempotentes; os dados de demonstração são aplicados por uma operação de seed separada, sem apagar registros existentes.

## Verificação

Validar migração e seed no PostgreSQL local, verificar carregamento e persistência após recarregar, testar edição/criação de cada entidade, checklist, filtro, alternância de tema e executar lint/build. Não há objetivo de adicionar autenticação, sincronização entre bancos ou novo layout nesta entrega.
