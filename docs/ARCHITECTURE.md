# Arquitetura

## Etapa atual
Next.js App Router com a interface do workspace em `src/components/workspace-app.tsx`. O acesso usa Route Handlers de autenticação e sessões PostgreSQL armazenadas no schema privado `nexo`; `src/lib/auth.ts` centraliza a sessão e as verificações de autorização. `src/app/globals.css` e `src/app/auth.css` mantêm o sistema visual responsivo e a tela de login.

## Próxima etapa recomendada
Separar módulos por domínio (`features/projects`, `features/tasks`, `features/users`), mover validações para Zod, formularios para React Hook Form, e criar adaptadores de acesso a dados no servidor. Usar `@supabase/ssr` para clientes de servidor/navegador e manter operações privilegiadas em Route Handlers ou Server Actions confiáveis.

## Segurança
O painel e as APIs exigem sessão ativa verificada no servidor. A aba e as operações de usuário exigem `access_role = 'Administrador'`. Senhas usam hash scrypt com salt único e sessões guardam somente o hash do token de sessão. O banco de dados local e o Supabase PostgreSQL usam a mesma migração. A UI nunca é a única barreira de acesso.
