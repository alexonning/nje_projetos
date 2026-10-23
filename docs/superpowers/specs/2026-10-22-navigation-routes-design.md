# Design: URLs para as telas do workspace

## Objetivo

Dar a cada tela principal do Nexo uma URL direta e compartilhável. A URL será a fonte de verdade para a navegação, incluindo a identificação do projeto aberto.

## Contexto atual

O App Router tem uma única página autenticada em `/`. `WorkspaceApp` seleciona Dashboard, Projetos, Usuários e Configurações com estado local. O botão “Abrir projeto” troca para o Kanban e filtra tarefas pelo nome do projeto; o endereço do navegador não muda. Isso impede atualizar ou compartilhar um link para uma tela específica.

## Rotas aprovadas

| URL | Tela |
| --- | --- |
| `/` | Redireciona para `/dashboard` |
| `/dashboard` | Dashboard |
| `/projetos` | Lista de projetos |
| `/projetos/{id}` | Kanban filtrado pelo ID do projeto |
| `/tarefas` | Kanban com tarefas de todos os projetos |
| `/usuarios` | Administração de usuários |
| `/configuracoes` | Configurações |

O caminho `/projetos/{id}` mantém o comportamento atual de “Abrir projeto”: mostra o Kanban desse projeto, mas identifica o projeto pelo ID estável, e não pelo nome. A lista de projetos permanece em `/projetos`.

## Arquitetura e fluxo

- Criar páginas explícitas no App Router para as rotas acima e manter `/` como redirecionamento para `/dashboard`.
- Reutilizar o shell autenticado e `WorkspaceApp`; a navegação entre as telas usa o roteador do Next.js, e a tela ativa é derivada do caminho atual.
- Manter autenticação em todas as páginas do workspace. Uma sessão ausente continua sendo redirecionada para `/login`.
- Restringir `/usuarios` a administradores também no acesso direto à URL. Usuários sem esse papel são encaminhados ao Dashboard, e a tela administrativa não é renderizada.
- Ao abrir um projeto pelo cartão, tabela ou atalho lateral, navegar para `/projetos/{id}`. As tarefas do Kanban são filtradas por `projectId`; o nome exibido vem do registro do projeto.
- Os atalhos do Dashboard que abrem o Kanban geral navegam para `/tarefas`; a visualização geral inclui tarefas de todos os projetos.
- Os atalhos Dashboard, Projetos, Usuários, Configurações e o atalho de configurações do perfil devem navegar para seus caminhos canônicos. O atalho lateral de projeto abre seu caminho com ID.
- Depois de criar um projeto, voltar para `/projetos`. Atualizar a página, colar uma URL diretamente e usar voltar/avançar devem manter a tela correspondente.
- Durante o carregamento, não mostrar um quadro sem filtro. Se o ID não corresponder a um projeto após os dados carregarem, mostrar um estado de projeto não encontrado com retorno para `/projetos`.

## Alternativas consideradas

1. **Páginas explícitas do App Router (escolhida):** deixa cada URL clara, facilita controlar autenticação e respostas para IDs inválidos, e segue o roteamento padrão do Next.js.
2. **Uma rota catch-all que interpreta todos os caminhos:** reduz a quantidade inicial de arquivos, mas concentra regras de página em uma rota genérica e torna caminhos inválidos menos claros.
3. **Alterar o histórico manualmente mantendo apenas `/`:** exige menos mudanças visíveis no roteador, mas não oferece suporte confiável para carregar ou atualizar links diretos.

## Critérios de aceitação

- Cada URL na tabela abre sua tela correspondente após navegação, acesso direto e atualização.
- `/` redireciona para `/dashboard`.
- Abrir um projeto pela interface coloca seu ID no endereço e exibe somente tarefas com esse `projectId`.
- Voltar e avançar no navegador atualizam a tela e o projeto selecionado.
- Acesso sem sessão continua indo para `/login`; acesso não administrativo a `/usuarios` não revela a lista de usuários.
- Um ID de projeto inexistente mostra o estado de projeto não encontrado, sem exibir tarefas de outro projeto.
