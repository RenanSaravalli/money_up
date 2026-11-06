import { redirect } from "next/navigation";
import { environmentStatus } from "@/lib/env";
import { getSession } from "@/lib/session";
import { getSnapshot } from "@/features/finance/service";
import { emptySnapshot } from "@/types/finance";
import { FinanceProvider } from "@/components/finance-provider";
import { AppShell } from "@/components/layout/app-shell";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured = environmentStatus().ready;
  if (!configured && process.env.NODE_ENV === "production") redirect("/login");
  const session = configured ? await getSession() : null;
  if (configured && !session) redirect("/login");
  let data = emptySnapshot,
    initialError;
  if (session)
    try {
      data = await getSnapshot(session.user.id);
    } catch {
      initialError =
        "Não foi possível carregar suas finanças. Verifique a conexão e as migrations do Neon.";
    }
  return (
    <FinanceProvider
      initialData={data}
      configured={configured}
      userName={session?.user.name ?? ""}
      initialError={initialError}
    >
      <AppShell>{children}</AppShell>
    </FinanceProvider>
  );
}
