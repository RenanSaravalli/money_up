"use client";
import { useState } from "react";
import {
  Plus,
  ArrowUpRight,
  Wallet,
  PiggyBank,
  Landmark,
  ArrowRight,
} from "lucide-react";
import { useFinance } from "@/components/finance-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Icon } from "@/components/icons";
import { money } from "@/lib/money";
import { summarize } from "@/lib/finance";
import { cn } from "@/lib/utils";
export function Accounts() {
  const { data, setEditor, openTransaction } = useFinance();
  const [showArchived, setShowArchived] = useState(false);
  const summary = summarize(data.accounts, data.transactions);
  const accounts = data.accounts.filter((a) => showArchived || a.active);
  return (
    <div className="accounts-page">
      <PageHeader
        title="Minhas contas"
        eyebrow="CADA VALOR, EM SEU LUGAR"
        action="Adicionar conta"
        onAction={() => setEditor({ type: "account" })}
      />
      <section className="accounts-overview">
        <div>
          <span>Seu saldo em todas as contas</span>
          <h2>{money(summary.total)}</h2>
          <small>Inclui contas de reserva e contas arquivadas.</small>
        </div>
        <span className="overview-orbit">
          <Wallet size={34} strokeWidth={1.2} />
        </span>
        <div className="accounts-overview-footer">
          <span>
            <PiggyBank size={17} />
            Guardado em reservas<strong>{money(summary.reserve)}</strong>
          </span>
          <button onClick={() => openTransaction("transfer")}>
            Transferir
            <ArrowUpRight size={17} />
          </button>
        </div>
      </section>
      <div className="section-heading accounts-heading">
        <h2>
          Suas contas
          <span className="count-label">
            {data.accounts.length.toString().padStart(2, "0")}
          </span>
        </h2>
        {data.accounts.some((a) => !a.active) && (
          <label className="archive-toggle">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Ver arquivadas
          </label>
        )}
      </div>
      <div className="accounts-grid">
        {accounts.map((a) => (
          <button
            className={cn("account-detail-card", !a.active && "archived")}
            key={a.id}
            onClick={() => setEditor({ type: "account", value: a })}
          >
            <div className="account-detail-top">
              <span
                style={{ background: `${a.color}18`, color: a.color }}
                className="account-detail-icon"
              >
                <Icon name={a.icon} size={25} />
              </span>
              <ArrowUpRight size={18} />
            </div>
            <h3>{a.name}</h3>
            <span className="account-type">
              {!a.active
                ? "Arquivada"
                : a.type === "reserve"
                  ? "Reserva"
                  : a.type === "cash"
                    ? "Dinheiro"
                    : "Conta corrente"}
            </span>
            <div className="account-detail-balance">
              <span>Saldo atual</span>
              <strong>{money(a.balance)}</strong>
            </div>
            <span
              className="account-card-line"
              style={{ background: a.color }}
            />
          </button>
        ))}
        <button
          className="new-account-tile"
          onClick={() => setEditor({ type: "account" })}
        >
          <span className="dashed-icon">
            <Plus size={23} />
          </span>
          <h3>
            {data.accounts.length
              ? "Mais uma conta"
              : "Sua organização começa aqui"}
          </h3>
          <p>
            {data.accounts.length
              ? "Um novo lugar para seu dinheiro."
              : "Conta corrente, carteira ou reserva.\nAdicione onde você guarda seu dinheiro."}
          </p>
          <span className="text-action">
            Adicionar conta
            <ArrowRight size={16} />
          </span>
        </button>
      </div>
      <div className="accounts-footnote">
        <Landmark size={17} />
        <p>
          Os saldos são calculados a partir do saldo inicial e das
          movimentações. Transferências movem dinheiro entre suas contas sem
          alterar seu saldo total.
        </p>
      </div>
      <section className="categories-management">
        <div className="section-heading">
          <h2>Suas categorias</h2>
          <button
            className="text-action"
            onClick={() => setEditor({ type: "category" })}
          >
            <Plus size={15} />
            Criar
          </button>
        </div>
        {data.categories.length ? (
          <div className="category-chips">
            {data.categories.map((c) => (
              <button
                onClick={() => setEditor({ type: "category", value: c })}
                key={c.id}
                className={c.kind}
              >
                <Icon name={c.icon} size={15} />
                {c.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="field-hint">
            As categorias iniciais são criadas junto com seu usuário. Você
            também pode personalizá-las.
          </p>
        )}
      </section>
    </div>
  );
}
