"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  ArrowDownWideNarrow,
  Tag,
  X,
  ArrowUpRight,
} from "lucide-react";
import { useFinance } from "@/components/finance-provider";
import { PageHeader } from "@/components/layout/page-header";
import {
  TransactionList,
  EmptyTransactions,
} from "@/components/transaction-list";
import { money } from "@/lib/money";
import { localDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
function HistoryContent() {
  const { data, openTransaction, setEditor } = useFinance();
  const params = useSearchParams();
  const [search, setSearch] = useState(""),
    [kind, setKind] = useState("all"),
    [filters, setFilters] = useState(false),
    [category, setCategory] = useState(""),
    [account, setAccount] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [ascending, setAscending] = useState(false);
  const txs = data.transactions
    .filter(
      (t) =>
        (kind === "all" || t.kind === kind) &&
        (!category || t.categoryId === category) &&
        (!account ||
          t.accountId === account ||
          t.destinationAccountId === account) &&
        (!from || localDate(t.occurredAt) >= from) &&
        (!to || localDate(t.occurredAt) <= to) &&
        `${t.description} ${t.notes ?? ""} ${data.categories.find((c) => c.id === t.categoryId)?.name ?? ""}`
          .toLocaleLowerCase("pt-BR")
          .includes(search.toLocaleLowerCase("pt-BR")),
    )
    .sort(
      (a, b) =>
        (ascending ? 1 : -1) *
        (new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()),
    );
  const income = txs
      .filter((t) => t.kind === "income")
      .reduce((v, t) => v + BigInt(t.amount), 0n),
    expense = txs
      .filter((t) => t.kind === "expense")
      .reduce((v, t) => v + BigInt(t.amount), 0n);
  const activeFilters = [category, account, from, to].filter(Boolean).length;
  return (
    <div className="history-page">
      <PageHeader
        title="Histórico"
        eyebrow="CADA MOVIMENTO IMPORTA"
        action="Nova transação"
        onAction={() => openTransaction()}
      />
      <div className="history-summary">
        <div>
          <span>
            <i className="income-dot" />
            Entradas
          </span>
          <strong>{money(income)}</strong>
        </div>
        <div>
          <span>
            <i className="expense-dot" />
            Saídas
          </span>
          <strong>{money(expense)}</strong>
        </div>
        <div>
          <span>Resultado</span>
          <strong>{money(income - expense)}</strong>
        </div>
      </div>
      <div className="history-toolbar">
        <label className="search-field">
          <Search size={19} />
          <input
            placeholder="Buscar uma movimentação…"
            aria-label="Pesquisar transações"
            autoFocus={params.get("search") === "1"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Limpar pesquisa">
              <X size={16} />
            </button>
          )}
        </label>
        <button
          className={cn("filter-button", filters && "active")}
          onClick={() => setFilters(!filters)}
        >
          <SlidersHorizontal size={17} />
          <span>Filtros</span>
          {activeFilters > 0 && <b>{activeFilters}</b>}
        </button>
      </div>
      <div className="history-tabs">
        <div className="type-tabs">
          {[
            ["all", "Todas"],
            ["income", "Receitas"],
            ["expense", "Despesas"],
            ["transfer", "Transferências"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={cn(kind === value && "active")}
              onClick={() => setKind(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          className="sort-button"
          onClick={() => setAscending(!ascending)}
          aria-label={
            ascending ? "Ordenar por mais recentes" : "Ordenar por mais antigas"
          }
        >
          <ArrowDownWideNarrow size={17} />
          <span>{ascending ? "Mais antigas" : "Mais recentes"}</span>
        </button>
      </div>
      {filters && (
        <div className="filters-panel">
          <label>
            Categoria
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Todas as categorias</option>
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.kind === "income" ? "Receita" : "Despesa"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Conta
            <select
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            >
              <option value="">Todas as contas</option>
              {data.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            De
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            Até
            <input
              type="date"
              min={from || undefined}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button
            className="text-action"
            onClick={() => {
              setCategory("");
              setAccount("");
              setFrom("");
              setTo("");
            }}
          >
            Limpar filtros
          </button>
        </div>
      )}
      <div className="history-content">
        {txs.length ? (
          <>
            <div className="history-count">
              {txs.length} {txs.length === 1 ? "movimentação" : "movimentações"}
            </div>
            <TransactionList transactions={txs} grouped />
          </>
        ) : data.transactions.length ? (
          <div className="no-results">
            <Search size={32} />
            <h3>Nenhum movimento por aqui</h3>
            <p>Tente outra busca ou ajuste os filtros.</p>
          </div>
        ) : (
          <EmptyTransactions />
        )}
      </div>
      <button
        className="manage-categories"
        onClick={() => setEditor({ type: "category" })}
      >
        <Tag size={16} />
        Criar categoria
        <ArrowUpRight size={15} />
      </button>
    </div>
  );
}
export function Transactions() {
  return (
    <Suspense
      fallback={<div className="loading-state">Carregando histórico…</div>}
    >
      <HistoryContent />
    </Suspense>
  );
}
