# Arquitetura

## Etapa atual
Next.js App Router com uma página cliente para validar os principais fluxos visuais. `src/components/workspace.tsx` mantém o estado demonstrativo e os componentes das telas; `src/app/globals.css` contém o sistema visual responsivo.

## Próxima etapa recomendada
Separar módulos por domínio (`features/projects`, `features/tasks`, `features/users`), mover validações para Zod, formularios para React Hook Form, e criar adaptadores de acesso a dados no servidor. Usar `@supabase/ssr` para clientes de servidor/navegador e manter operações privilegiadas em Route Handlers ou Server Actions confiáveis.

## Segurança
A tela sem login deve ser permitida somente em ambiente de desenvolvimento. Em produção, exigir autenticação e autorização no servidor e no PostgreSQL via RLS. A UI nunca é a única barreira de acesso.
