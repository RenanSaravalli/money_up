import { getSession } from "@/lib/session";
import { getEnvironment } from "@/lib/env";
import {
  FinanceError,
  mutateFinance,
  type Resource,
} from "@/features/finance/service";
import { z } from "zod";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handle(
  request: Request,
  context: { params: Promise<{ resource: string }> },
) {
  const responseHeaders = { "Cache-Control": "private, no-store" };
  try {
    const session = await getSession();
    if (!session)
      return Response.json(
        { error: "Sua sessão expirou. Entre novamente." },
        { status: 401, headers: responseHeaders },
      );
    if (
      request.headers.get("origin") !==
      new URL(getEnvironment().BETTER_AUTH_URL).origin
    )
      return Response.json(
        { error: "Origem não autorizada." },
        { status: 403, headers: responseHeaders },
      );
    const { resource } = await context.params;
    if (!["transactions", "accounts", "cards", "categories"].includes(resource))
      return Response.json(
        { error: "Recurso não encontrado." },
        { status: 404, headers: responseHeaders },
      );
    if (Number(request.headers.get("content-length") ?? 0) > 16_384)
      return Response.json(
        { error: "Requisição muito grande." },
        { status: 413, headers: responseHeaders },
      );
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 16_384)
      return Response.json(
        { error: "Requisição muito grande." },
        { status: 413, headers: responseHeaders },
      );
    await mutateFinance(
      session.user.id,
      resource as Resource,
      request.method,
      raw ? JSON.parse(raw) : {},
      new URL(request.url).searchParams.get("id"),
    );
    return Response.json({ ok: true }, { headers: responseHeaders });
  } catch (error) {
    if (error instanceof z.ZodError)
      return Response.json(
        {
          error: error.issues[0]?.message ?? "Dados inválidos.",
          issues: error.flatten(),
        },
        { status: 400, headers: responseHeaders },
      );
    if (error instanceof FinanceError)
      return Response.json(
        { error: error.message },
        { status: error.status, headers: responseHeaders },
      );
    if (error instanceof SyntaxError)
      return Response.json(
        { error: "Dados inválidos." },
        { status: 400, headers: responseHeaders },
      );
    const code =
      (error as { cause?: { code?: string }; code?: string }).cause?.code ??
      (error as { code?: string }).code;
    if (code === "23503")
      return Response.json(
        {
          error:
            "Este registro está vinculado a movimentações e não pode ser removido ou alterado.",
        },
        { status: 409, headers: responseHeaders },
      );
    if (code === "23505")
      return Response.json(
        { error: "Este registro já existe." },
        { status: 409, headers: responseHeaders },
      );
    return Response.json(
      {
        error:
          "Não foi possível salvar. Verifique a conexão antes de tentar novamente.",
      },
      { status: 500, headers: responseHeaders },
    );
  }
}
export { handle as POST, handle as PATCH, handle as DELETE };
