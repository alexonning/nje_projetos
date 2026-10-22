# Responsáveis e tags nas tarefas — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alinhar a seleção de responsáveis e permitir administrar etiquetas ao criar e editar tarefas.

**Architecture:** Reutilizar os componentes React atuais do workspace. O seletor de responsáveis mantém a lista de checkboxes e ganha dimensões e estados visuais explícitos; um editor controlado de tags atualiza os arrays já enviados pela API.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS existente e Playwright para inspeção visual solicitada.

**Spec:** `docs/superpowers/specs/2026-10-22-task-assignees-tags-design.md`

## Global Constraints

- Preservar o layout e a paleta já usados pelo Nexo.
- Não alterar API, schema ou bibliotecas.
- Aceitar no máximo 30 tags por tarefa e 40 caracteres por tag.
- Não enviar a tarefa durante a inspeção visual.

## Review Focus

- Checkbox dos responsáveis mantém largura fixa e não desloca avatar ou nome.
- Enter adiciona exatamente uma tag sem submeter a tarefa.
- Espaços externos são removidos e nomes de tags repetidos não são aceitos.
- Uma tag removida não reaparece ao salvar a tarefa.
- Lista de tags permanece utilizável em viewport estreito e no modal de edição.

---

### Task 1: Controles de responsáveis e tags

**Files:**
- Modify: `src/components/workspace-app.tsx`
- Modify: `src/app/theme.css`

**Interfaces:**
- `AssigneeOptions` continua recebendo `users`, `selected` e `onChange`.
- Criar `TagEditor` controlado com `tags: string[]` e `onChange(tags: string[]): void`.

- [ ] Dar largura fixa ao checkbox e criar estados visuais alinhados para linhas de responsável selecionadas e não selecionadas.
- [ ] Substituir a string CSV de novas tags por `string[]` e usar `TagEditor` no modal de criação.
- [ ] Reutilizar `TagEditor` na edição de tarefas, incluindo adicionar via Enter/botão, remoção, trim, deduplicação sem diferenciar caixa e limites de entrada.
- [ ] Abrir o modal de criação com Playwright; adicionar duas tags, remover uma, tentar repetição e inspecionar o alinhamento sem salvar. Conferir também o editor no modal de edição.
