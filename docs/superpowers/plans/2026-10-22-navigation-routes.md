# Navegação por URLs Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the workspace canonical URLs for its main pages and project-specific Kanban boards.

**Architecture:** Use explicit Next.js App Router pages under a shared authenticated route-group layout. Keep `WorkspaceApp` mounted in that layout and derive its active view and project filter from `usePathname`; push canonical paths for in-app navigation.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript.

**Spec:** `docs/superpowers/specs/2026-10-22-navigation-routes-design.md`

## Global Constraints

- `/` redirects to `/dashboard`.
- `/projetos/{id}` opens the Kanban filtered by the stable project ID.
- `/tarefas` preserves the Dashboard's existing all-project Kanban shortcuts.
- Workspace routes require an authenticated session; `/usuarios` is limited to administrators.
- Invalid project IDs must not show an unfiltered or another project's board.

## Review Focus

- Direct access to protected routes without a session must reach `/login`.
- A non-administrator opening `/usuarios` directly must not see the user-management screen.
- An invalid project ID must show the not-found state after workspace data loads.
- Project filtering must use `projectId`, including when project names are equal.
- Browser back and forward must keep the URL and visible page in sync.

## File Structure

- `src/app/page.tsx`: canonical root redirect.
- `src/app/(workspace)/layout.tsx`: shared session check and persistent workspace shell.
- `src/app/(workspace)/**/page.tsx`: explicit route entry points; the layout-owned client shell selects the view from the path.
- `src/components/workspace-app.tsx`: path-to-view mapping, browser navigation, and ID-based project filtering.
- `docs/superpowers/specs/2026-10-22-navigation-routes-design.md`: approved behavior and acceptance criteria.

---

### Task 1: Add explicit authenticated routes

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/(workspace)/layout.tsx`
- Create: `src/app/(workspace)/dashboard/page.tsx`
- Create: `src/app/(workspace)/projetos/page.tsx`
- Create: `src/app/(workspace)/projetos/[id]/page.tsx`
- Create: `src/app/(workspace)/tarefas/page.tsx`
- Create: `src/app/(workspace)/usuarios/page.tsx`
- Create: `src/app/(workspace)/configuracoes/page.tsx`

**Interfaces:**
- Consumes: `getCurrentUser()` from `src/lib/auth.ts`, `ADMIN_ROLE`, and the existing `Workspace` component.
- Produces: a shared authenticated layout for all workspace paths; `/usuarios` redirects non-administrators to `/dashboard`; page entry points render no duplicate shell because `WorkspaceApp` owns route content.

- [x] **Step 1: Redirect `/` to `/dashboard`**

Replace the root page's standalone workspace rendering with the App Router `redirect` to `/dashboard`.

- [x] **Step 2: Add the shared authenticated layout**

In `(workspace)/layout.tsx`, load the current user on the server, redirect missing sessions to `/login`, and render the persistent `Workspace` with its child route.

- [x] **Step 3: Add explicit workspace page entry points**

Create the dashboard, project-list, project-ID, all-tasks, and settings pages as route markers for the shared client shell.

- [x] **Step 4: Guard the users route**

On `/usuarios`, check the authenticated user's role and redirect non-administrators to `/dashboard` before rendering the route marker.

**Expected:** Next.js resolves every route in the spec, root redirects, and server-side route checks keep workspace pages behind authentication.

---

### Task 2: Make URL state drive navigation and project boards

**Files:**
- Modify: `src/components/workspace-app.tsx`

**Interfaces:**
- Consumes: the current path from `usePathname()`, navigation from `useRouter()`, and workspace `Project.id` / `Task.projectId` values.
- Produces: canonical navigation targets for Dashboard, project list, all tasks, project-specific boards, users, and settings.

- [x] **Step 1: Derive the active view and project ID from the path**

Map `/dashboard`, `/projetos`, `/tarefas`, `/usuarios`, `/configuracoes`, and `/projetos/{id}` to their existing views. Use the dynamic segment as the board filter ID.

- [x] **Step 2: Replace internal page-state navigation with App Router navigation**

Update sidebar items, profile settings, Dashboard shortcuts, project cards, project table actions, and project shortcuts to push their canonical paths. Keep project-list filters local to the list view.

- [x] **Step 3: Filter the Kanban by project ID and handle missing projects**

For `/projetos/{id}`, filter tasks by `task.projectId`, lock new tasks to that ID, and use the project's name as the board title. While data loads, avoid rendering an unfiltered board. After loading, show a not-found state with a link to `/projetos` if the ID is absent.

- [x] **Step 4: Keep Dashboard's general Kanban actions working**

Route Dashboard actions that open all tasks to `/tarefas`; that route renders the unfiltered Kanban.

**Expected:** The pathname selects the correct view; project navigation, refresh, and browser history preserve the selected route and project ID.

---

### Task 3: Build and review the routed workspace

**Files:**
- Review: `src/app/page.tsx`
- Review: `src/app/(workspace)/layout.tsx` and route pages
- Review: `src/components/workspace-app.tsx`

- [x] **Step 1: Run the production build**

Run: `node node_modules/next/dist/bin/next build`

Expected: the build completes without route conflicts or TypeScript errors.

- [x] **Step 2: Review route coverage and failure states**

Inspect each explicit route against the spec and confirm the five Review Focus cases are handled in the route guard, path mapping, loading state, ID filter, and history navigation code.
