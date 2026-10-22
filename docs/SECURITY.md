# Segurança

- O painel e todas as rotas de dados exigem uma sessão válida. Operações de usuário e redefinição de senha também exigem o papel `Administrador` no servidor.
- Senhas são armazenadas com `scrypt`, salt aleatório individual e comparação de hash em tempo constante. O formato do hash guarda os parâmetros necessários para verificação.
- Sessões usam tokens aleatórios; somente o SHA-256 do token fica no PostgreSQL. O cookie é `HttpOnly`, `SameSite=Lax`, limitado a `/` e `Secure` em produção.
- O logout remove a sessão atual. Redefinir senha remove todas as sessões da conta alvo.
- O login bloqueia temporariamente após cinco tentativas falhas na janela de 15 minutos e retorna mensagens genéricas para credenciais inválidas.
- Requisições que alteram dados precisam vir da mesma origem. As verificações de sessão e papel acontecem nas Route Handlers; esconder controles na interface não é a barreira de segurança.
- `AUTH_BOOTSTRAP_ADMIN_*` só é usado para criar o administrador inicial. Remova essas variáveis depois do comando de bootstrap; não configure a senha de bootstrap como variável pública `NEXT_PUBLIC_*`.
- As credenciais ficam em schema privado `nexo` e são acessadas pelo servidor através da conexão PostgreSQL. Não conceda acesso direto às tabelas de autenticação pelo Data API.
- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no navegador. O projeto não depende dessa chave para autenticação própria.

Registros de usuários criados antes da autenticação continuam sem senha. O administrador precisa definir o e-mail e atribuir uma senha antes que essas pessoas possam entrar.

Uploads privados, RLS de tabelas expostas e auditoria persistida ainda precisam ser tratados quando esses recursos forem conectados.
