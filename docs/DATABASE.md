# Banco de dados

O schema inicial compartilhado está em `database/schema.sql` dentro do schema PostgreSQL `nexo`, evitando colisão com tabelas de outras aplicações no banco padrão `postgres`; os dados demonstrativos opcionais estão em `database/seed.sql`. Ambos podem ser aplicados no PostgreSQL local ou no Supabase por `DATABASE_PROVIDER`.

1. Copie `.env.example` para `.env.local`.
2. Mantenha `DATABASE_PROVIDER=local` e configure `LOCAL_DATABASE_URL`.
3. Execute `npm run db:check`, `npm run db:migrate` e, opcionalmente, `npm run db:seed`.

Para selecionar o Supabase, configure `SUPABASE_DATABASE_URL` com a string copiada em **Database → Connect** e use `DATABASE_PROVIDER=supabase`. Para uma aplicação serverless, use o pooler de transação e TLS conforme a recomendação atual do Supabase. A mesma migração deve estar aplicada no banco escolhido.

As rotas desta prévia usam conexão PostgreSQL exclusivamente no servidor e são bloqueadas fora de desenvolvimento, pois ainda não existe autenticação. Não exponha strings de conexão ao navegador nem publique acesso a dados reais até implementar autenticação e autorização.
