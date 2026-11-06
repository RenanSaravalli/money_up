"use client";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  Snapshot,
  Transaction,
  TransactionKind,
  FinancialAccount,
  Card,
  Category,
} from "@/types/finance";
import { FinanceForms } from "@/features/finance/forms";
export type Editor =
  | { type: "transaction"; kind?: TransactionKind; value?: Transaction }
  | { type: "account"; value?: FinancialAccount }
  | { type: "card"; value?: Card }
  | { type: "category"; value?: Category }
  | { type: "profile" }
  | { type: "setup" }
  | null;
type Context = {
  data: Snapshot;
  configured: boolean;
  userName: string;
  editor: Editor;
  setEditor: (value: Editor) => void;
  openTransaction: (kind?: TransactionKind, value?: Transaction) => void;
  mutate: (
    resource: string,
    method: string,
    body?: unknown,
    id?: string,
  ) => Promise<void>;
  refresh: () => Promise<void>;
};
const FinanceContext = createContext<Context | null>(null);
export function FinanceProvider({
  children,
  initialData,
  configured,
  userName,
  initialError,
}: {
  children: ReactNode;
  initialData: Snapshot;
  configured: boolean;
  userName: string;
  initialError?: string;
}) {
  const [data, setData] = useState(initialData),
    [editor, setEditor] = useState<Editor>(null),
    [error, setError] = useState(initialError ?? ""),
    [loaded, setLoaded] = useState(!initialError);
  const router = useRouter();
  const refresh = useCallback(async () => {
    const response = await fetch("/api/finance", { cache: "no-store" });
    if (response.status === 401) {
      router.push("/login");
      throw new Error("Entre novamente para continuar.");
    }
    if (!response.ok)
      throw new Error(
        "Não foi possível atualizar os dados. Recarregue a página.",
      );
    setData(await response.json());
    setLoaded(true);
    setError("");
  }, [router]);
  const mutate = useCallback(
    async (resource: string, method: string, body?: unknown, id?: string) => {
      if (!configured)
        throw new Error("Configure o Neon e entre na sua conta para salvar.");
      const response = await fetch(
        `/api/finance/${resource}${id ? `?id=${id}` : ""}`,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body ?? {}),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) router.push("/login");
        throw new Error(result.error ?? "Não foi possível salvar.");
      }
      // A successful write stays successful even if a subsequent read loses connectivity.
      try {
        await refresh();
      } catch {
        setError(
          "Alteração salva. Reconecte e atualize para consultar os saldos mais recentes.",
        );
        toast.warning("Alteração salva; atualização dos dados pendente.");
      }
    },
    [configured, refresh, router],
  );
  function openTransaction(
    kind: TransactionKind = "expense",
    value?: Transaction,
  ) {
    setEditor({ type: "transaction", kind, value });
  }
  return (
    <FinanceContext.Provider
      value={{
        data,
        configured,
        userName,
        editor,
        setEditor,
        openTransaction,
        mutate,
        refresh,
      }}
    >
      {error && (
        <div className="data-error" role="alert">
          {error}
          <button
            onClick={() => refresh().catch((e) => toast.error(e.message))}
          >
            Atualizar
          </button>
        </div>
      )}
      {loaded ? (
        children
      ) : (
        <div className="standalone-state">
          <h1>Seus dados merecem uma conexão segura.</h1>
          <p>
            Não foi possível consultar seus saldos. Reconecte ao Neon e tente
            atualizar. Nenhum saldo estimado será mostrado.
          </p>
          <button
            className="button button-primary"
            onClick={() => refresh().catch((e) => toast.error(e.message))}
          >
            Tentar novamente
          </button>
        </div>
      )}
      <FinanceForms />
    </FinanceContext.Provider>
  );
}
export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("FinanceProvider ausente");
  return ctx;
}
