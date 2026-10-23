# Banco de dados

O schema compartilhado fica em `database/schema.sql`, no schema PostgreSQL `nexo`, para evitar colisão com tabelas de outras aplicações no banco padrão `postgres`. Dados demonstrativos opcionais estão em `database/seed.sql`.

## PostgreSQL local

1. Copie `.env.example` para `.env.local`.
2. Mantenha `DATABASE_PROVIDER=local` e configure `LOCAL_DATABASE_URL`.
3. Execute `npm run db:check`, `npm run db:migrate` e, opcionalmente, `npm run db:seed`.

## Supabase

No painel do projeto `spring-ia`, abra **Connect** e copie a connection string do pooler de transação para uso serverless. Salve-a somente em `.env.local` junto com `DATABASE_PROVIDER=supabase` e `SUPABASE_DATABASE_URL`. Use TLS. O `.gitignore` exclui esse arquivo do Git.

Execute `npm run db:check` e `npm run db:migrate`. O schema e as tabelas do Nexo ficam isolados em `nexo`; a migração inicial foi aplicada ao projeto `spring-ia` sem alterar as tabelas dos outros schemas.

O acesso ocorre exclusivamente pelo servidor Next.js usando `pg`; não há chamadas de navegador ao Supabase nem chaves `anon` ou `service_role` na aplicação. O schema `nexo` não está exposto pelo PostgREST e os papéis `anon` e `authenticated` não têm permissão `USAGE` nele.

O Supabase Security Advisor ainda sinaliza que RLS está desabilitado nas tabelas do Nexo. Não habilite RLS sem definir políticas: isso pode bloquear o acesso pelos papéis de cliente. Para este fluxo, mantenha o schema fora da API e as credenciais PostgreSQL somente no servidor. Revise políticas antes de qualquer exposição futura do schema à Data API.
