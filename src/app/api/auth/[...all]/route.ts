import { getAuth } from "@/lib/auth";
import { environmentStatus } from "@/lib/env";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handle(request: Request) {
  if (!environmentStatus().ready)
    return Response.json(
      { message: "Configure as variáveis de ambiente para entrar." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  return getAuth().handler(request);
}
export { handle as GET, handle as POST };
