import { apiError } from "@/lib/api-access";
import { isSameOriginMutation, revokeCurrentSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginMutation(request)) return Response.json({ error: "Origem da solicitação inválida." }, { status: 403 });
  try {
    await revokeCurrentSession();
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error, "Não foi possível encerrar a sessão.");
  }
}
