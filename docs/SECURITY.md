# Segurança

- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no navegador.
- Em produção, não disponibilize o dashboard anônimo nem dados reais sem autenticação.
- Habilite RLS em todas as tabelas acessíveis pela API.
- Proteja anexos com bucket privado e URLs assinadas temporárias.
- Registre atividades por meio de operações controladas; não permita que usuários comuns editem logs arbitrariamente.

Esses controles são requisitos de implementação futura e não estão ativos na prévia visual atual.
