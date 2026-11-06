import { getSession } from "@/lib/session";
import { getSnapshot } from "@/features/finance/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const headers = { "Cache-Control": "private, no-store, max-age=0" };
  try {
    const session = await getSession();
    if (!session)
      return Response.json(
        { error: "Entre para consultar suas finanças." },
        { status: 401, headers },
      );
    return Response.json(await getSnapshot(session.user.id), { headers });
  } catch {
    return Response.json(
      {
        error:
          "Não foi possível consultar seus dados. Verifique sua conexão e as migrations.",
      },
      { status: 503, headers },
    );
  }
}
