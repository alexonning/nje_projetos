import { ADMIN_ROLE, getCurrentUser, isSameOriginMutation, type AuthenticatedUser } from "@/lib/auth";

export async function requireApiUser(request: Request, administratorOnly = false): Promise<{ user: AuthenticatedUser } | { response: Response }> {
  if (!isSameOriginMutation(request)) {
    return { response: Response.json({ error: "Origem da solicitação inválida." }, { status: 403 }) };
  }

  const user = await getCurrentUser();
  if (!user) return { response: Response.json({ error: "Faça login para continuar." }, { status: 401 }) };
  if (administratorOnly && user.accessRole !== ADMIN_ROLE) {
    return { response: Response.json({ error: "Somente um administrador pode executar esta ação." }, { status: 403 }) };
  }
  return { user };
}

export function apiError(error: unknown, fallback: string): Response {
  console.error(fallback, error);
  return Response.json({ error: fallback }, { status: 500 });
}
