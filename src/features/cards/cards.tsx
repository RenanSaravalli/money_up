"use client";
import {
  CreditCard,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Nfc,
  Info,
} from "lucide-react";
import { useFinance } from "@/components/finance-provider";
import { PageHeader } from "@/components/layout/page-header";
import { money } from "@/lib/money";
export function Cards() {
  const { data, setEditor } = useFinance();
  return (
    <div className="cards-page">
      <PageHeader
        title="Meus cartões"
        eyebrow="SUA VIDA, MAIS ORGANIZADA"
        action="Adicionar cartão"
        onAction={() => setEditor({ type: "card" })}
      />
      <div className="cards-intro">
        <span className="eyebrow">TUDO NO SEU LUGAR</span>
        <h2>
          Seus cartões.
          <br />
          <span>Uma visão mais clara.</span>
        </h2>
        <p>Organize os cartões que fazem parte do seu dia.</p>
      </div>
      <div className="cards-grid">
        {data.cards.map((c) => (
          <button
            key={c.id}
            className="bank-card"
            style={{ "--card-color": c.color } as React.CSSProperties}
            onClick={() => setEditor({ type: "card", value: c })}
          >
            <div className="bank-card-top">
              <span>{c.institution}</span>
              <Nfc size={23} />
            </div>
            <span className="card-chip">
              <i />
              <i />
              <i />
            </span>
            <div className="bank-card-name">
              <h3>{c.name}</h3>
              <span>{c.type === "credit" ? "CRÉDITO" : "DÉBITO"}</span>
            </div>
            <div className="bank-card-footer">
              <span>
                {c.type === "credit"
                  ? `Limite cadastrado: ${money(c.limit ?? "0")}`
                  : data.accounts.find((a) => a.id === c.accountId)?.name}
                <small>
                  {c.type === "credit"
                    ? `Fecha dia ${c.closingDay} · Vence dia ${c.dueDay}`
                    : "Vinculado à sua conta"}
                </small>
              </span>
              <ArrowUpRight size={20} />
            </div>
          </button>
        ))}
        <button
          className="new-card-tile"
          onClick={() => setEditor({ type: "card" })}
        >
          <span className="card-empty-icon">
            <CreditCard size={29} />
            <span>
              <Plus size={12} />
            </span>
          </span>
          <h3>
            {data.cards.length
              ? "Adicionar outro cartão"
              : "Seu primeiro cartão"}
          </h3>
          <p>
            Guarde as informações que importam.
            <br />
            Deixe a organização com o Fluxo.
          </p>
          <span className="text-action">
            Adicionar cartão
            <ArrowUpRight size={16} />
          </span>
        </button>
      </div>
      <div className="credit-scope-note">
        <Info size={20} />
        <div>
          <strong>Um começo simples e consciente.</strong>
          <p>
            Nesta versão, os cartões são apenas cadastros de organização.
            Compras no crédito, dívidas, faturas e parcelamentos ainda não estão
            disponíveis. Para uma compra no débito, registre uma despesa na
            conta vinculada.
          </p>
        </div>
      </div>
      <div className="quiet-message">
        <ShieldCheck size={15} />
        <span>Não solicitamos número do cartão, CVV ou senha.</span>
      </div>
    </div>
  );
}
