import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    return user
      ? Response.json({ user })
      : Response.json({ error: "Faça login para continuar." }, { status: 401 });
  } catch (error) {
    return apiError(error, "Não foi possível carregar a sessão.");
  }
}
