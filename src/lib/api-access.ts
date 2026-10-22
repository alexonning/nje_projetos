export function developmentOnlyResponse(): Response | null {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Acesso disponível somente durante o desenvolvimento." }, { status: 403 });
  }

  return null;
}

export function apiError(error: unknown, fallback: string): Response {
  console.error(fallback, error);
  return Response.json({ error: fallback }, { status: 500 });
}
