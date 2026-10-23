# Deploy na Vercel

## Banco Supabase

O Nexo usa PostgreSQL apenas no servidor, dentro do schema `nexo`. Configure `DATABASE_PROVIDER=supabase` e `SUPABASE_DATABASE_URL` nos ambientes Production e Preview da Vercel. Marque a URL como secreta/criptografada; nunca use o prefixo `NEXT_PUBLIC_`.

Para a Vercel, use a connection string do pooler de transação do projeto Supabase (`spring-ia`) com TLS. A URL e a senha devem existir somente como variável de ambiente privada. Não as salve no Git nem as envie em mensagens.

Antes do primeiro deploy:

1. Configure a URL do Supabase localmente em `.env.local`, que é ignorado pelo Git.
2. Rode `npm run db:check` e `npm run db:migrate` para confirmar e criar o schema.
3. Crie o administrador inicial com `npm run auth:bootstrap`. As variáveis `AUTH_BOOTSTRAP_*` são de uso único e não devem ser configuradas na Vercel.
4. Configure `DATABASE_PROVIDER=supabase` e `SUPABASE_DATABASE_URL` como variáveis secretas na Vercel.
5. Conecte o repositório GitHub `alexonning/nje_projetos` ao projeto Vercel e faça o deploy da branch de produção.

O app não usa o Supabase Data API para acessar os dados. O schema `nexo` não está na lista de schemas expostos pelo PostgREST e os papéis `anon` e `authenticated` não têm permissão `USAGE` nele. As rotas de dados usam autenticação e autorização no servidor.

O Supabase Security Advisor ainda aponta RLS desabilitado nas 11 tabelas de `nexo`. Habilitar RLS sem políticas bloqueia acesso desses papéis às tabelas; qualquer política deve ser definida conforme o modelo de acesso do app antes de habilitar. Não exponha `nexo` à Data API.

## Proteção de configuração

- O `.gitignore` exclui arquivos `.env*`, exceto `.env.example`.
- Segredos de banco e autenticação são lidos apenas no servidor.
- O projeto define cabeçalhos HTTP de segurança e desativa o cabeçalho que identifica o Next.js.
- O Node.js mínimo configurado é 22.

Consulte [Banco de dados](DATABASE.md) para desenvolvimento local e migrações.
