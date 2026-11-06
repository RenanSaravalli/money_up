"use client";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from "lucide-react";
import { useFinance } from "./finance-provider";
import { Icon } from "./icons";
import { money } from "@/lib/money";
import { dateLabel, localDate } from "@/lib/dates";
import type { Transaction } from "@/types/finance";
export function TransactionCard({
  transaction: t,
}: {
  transaction: Transaction;
}) {
  const { data, openTransaction } = useFinance();
  const category = data.categories.find((c) => c.id === t.categoryId);
  return (
    <button
      className="transaction-card"
      onClick={() => openTransaction(t.kind, t)}
      aria-label={`Editar ${t.description}, ${money(t.amount)}`}
    >
      <span className={`transaction-icon ${t.kind}`}>
        <Icon name={category?.icon ?? t.kind} size={21} />
      </span>
      <span className="transaction-info">
        <strong>{t.description}</strong>
        <small>{dateLabel(t.occurredAt, true)}</small>
      </span>
      <span className={`transaction-amount ${t.kind}`}>
        {t.kind === "income" ? "+ " : t.kind === "expense" ? "− " : ""}
        {money(t.amount)}
      </span>
    </button>
  );
}
export function TransactionList({
  transactions,
  grouped = false,
}: {
  transactions: Transaction[];
  grouped?: boolean;
}) {
  return (
    <div className="transaction-list">
      {transactions.map((t, i) => (
        <div key={t.id}>
          {grouped &&
            (i === 0 ||
              localDate(t.occurredAt) !==
                localDate(transactions[i - 1].occurredAt)) && (
              <h3 className="day-label">
                {new Intl.DateTimeFormat("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                }).format(new Date(t.occurredAt))}
              </h3>
            )}
          <TransactionCard transaction={t} />
        </div>
      ))}
    </div>
  );
}
export function EmptyTransactions({ compact = false }: { compact?: boolean }) {
  const { openTransaction, data, setEditor } = useFinance();
  return (
    <div className={`empty-transactions ${compact ? "compact" : ""}`}>
      <div className="empty-orbit">
        <ArrowDownLeft size={21} />
        <ArrowUpRight size={18} />
        <ArrowLeftRight size={17} />
      </div>
      <h3>Seu próximo passo começa aqui</h3>
      <p>
        Registre sua primeira movimentação
        <br />e acompanhe seu dinheiro com clareza.
      </p>
      <button
        className="text-action"
        onClick={() =>
          data.accounts.some((a) => a.active)
            ? openTransaction()
            : setEditor({ type: "account" })
        }
      >
        {data.accounts.some((a) => a.active)
          ? "Adicionar transação"
          : "Criar minha primeira conta"}
        <ArrowUpRight size={15} />
      </button>
    </div>
  );
}
