# Responsáveis e tags nas tarefas

## Objetivo

Melhorar a seleção de responsáveis no modal de tarefas e permitir adicionar e remover tags pelo nome, preservando o layout existente do Nexo.

## Interface

- Cada responsável ativo aparece em uma linha selecionável com checkbox de tamanho fixo, avatar e nome alinhados à esquerda.
- Linhas selecionadas recebem destaque leve na cor violeta já usada pelo produto.
- O editor de tags tem um campo de texto e ação **Adicionar**. Enter também adiciona a tag.
- As tags adicionadas aparecem como etiquetas com controle **×** para remoção antes de salvar.
- O mesmo editor de tags é usado na criação e na edição de tarefas.
- Tags vazias, repetidas (sem diferenciar maiúsculas/minúsculas), com mais de 40 caracteres ou acima do limite atual de 30 não podem ser adicionadas.
- Responsáveis continuam sendo selecionados por checkbox e tags continuam sendo salvas como parte da tarefa pelo endpoint existente.

## Escopo técnico

Alterar os controles no componente de workspace e as regras de estilo associadas. Não alterar schema, endpoints, autenticação, nem o layout das outras áreas.

## Verificação

Usar Playwright no modal de nova tarefa para conferir alinhamento dos responsáveis e interagir com o editor: adicionar uma tag por Enter, outra pelo botão, remover uma etiqueta e confirmar que duplicatas não são adicionadas. Inspecionar também a edição da tarefa para conferir o componente compartilhado. Não enviar o formulário durante a inspeção.
