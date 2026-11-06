"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  CreditCard,
  Bell,
  Search,
  ChevronRight,
  ArrowRight,
  Eye,
  EyeOff,
  Wallet,
  PiggyBank,
  TrendingUp,
  ShieldCheck,
  Plus,
  CalendarDays,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useFinance } from "@/components/finance-provider";
import { Icon } from "@/components/icons";
import {
  TransactionList,
  EmptyTransactions,
} from "@/components/transaction-list";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { money } from "@/lib/money";
import { summarize } from "@/lib/finance";
import { localDate } from "@/lib/dates";

export function Dashboard() {
  const { data, configured, userName, openTransaction, setEditor } =
    useFinance();
  const router = useRouter();
  const [visible, setVisible] = useState(true),
    [notifications, setNotifications] = useState(false);
  const summary = summarize(data.accounts, data.transactions);
  const currentMonth = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const expenseCategories = data.categories
    .filter((c) => c.kind === "expense")
    .map((c) => ({
      ...c,
      total: data.transactions
        .filter(
          (t) =>
            t.categoryId === c.id &&
            localDate(t.occurredAt).startsWith(localDate().slice(0, 7)),
        )
        .reduce((v, t) => v + BigInt(t.amount), 0n),
    }))
    .filter((c) => c.total > 0n)
    .sort((a, b) => (a.total > b.total ? -1 : 1))
    .slice(0, 3);
  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <button
          className="greeting"
          onClick={() => setEditor({ type: configured ? "profile" : "setup" })}
        >
          <span className="avatar avatar-main">
            {userName ? (
              userName.slice(0, 1).toUpperCase()
            ) : (
              <span className="avatar-flower">✳</span>
            )}
          </span>
          <span>
            <small>Bom ter você por aqui</small>
            <strong>
              Olá, {userName ? userName.split(" ")[0] : "bem-vindo"}!
            </strong>
          </span>
        </button>
        <div className="header-tools">
          <button
            className="circle-button"
            onClick={() => setNotifications(true)}
            aria-label="Notificações"
          >
            <Bell size={19} />
          </button>
          <button
            className="circle-button"
            onClick={() => router.push("/transactions?search=1")}
            aria-label="Pesquisar transações"
          >
            <Search size={19} />
          </button>
        </div>
      </header>
      <div className="dashboard-grid">
        <div className="dashboard-primary">
          <section className="balance-section">
            <div className="balance-label">
              Saldo total
              <button
                onClick={() => setVisible(!visible)}
                aria-label={visible ? "Ocultar saldo" : "Mostrar saldo"}
              >
                {visible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
            <h1 className="balance-value">
              {visible ? money(summary.total) : "R$ •••••"}
            </h1>
            <div
              className={`balance-change ${summary.result < 0n ? "negative" : ""}`}
            >
              {summary.hasMonthlyData ? (
                <>
                  <TrendingUp size={14} />
                  <span>
                    {summary.result >= 0n ? "+ " : ""}
                    {visible ? money(summary.result) : "••••"}
                  </span>
                  <span className="balance-change-label">
                    de resultado neste mês
                  </span>
                </>
              ) : (
                <>
                  <span className="subtle-dot" />
                  <span>Um novo começo para suas finanças</span>
                </>
              )}
            </div>
            <div className="quick-actions">
              {[
                {
                  label: "Receita",
                  icon: ArrowDownLeft,
                  action: () => openTransaction("income"),
                },
                {
                  label: "Despesa",
                  icon: ArrowUpRight,
                  action: () => openTransaction("expense"),
                },
                {
                  label: "Transferir",
                  icon: ArrowLeftRight,
                  action: () => openTransaction("transfer"),
                },
                {
                  label: "Cartões",
                  icon: CreditCard,
                  action: () => router.push("/cards"),
                },
              ].map((a) => (
                <button key={a.label} onClick={a.action}>
                  <span className="quick-action-icon">
                    <a.icon size={24} strokeWidth={1.4} />
                  </span>
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="recent-section">
            <div className="section-heading">
              <h2>Últimas transações</h2>
              <Link href="/transactions">
                Ver todas
                <ChevronRight size={14} />
              </Link>
            </div>
            {data.transactions.length ? (
              <TransactionList transactions={data.transactions.slice(0, 4)} />
            ) : (
              <EmptyTransactions compact />
            )}
          </section>
          <section className="accounts-section">
            <div className="section-heading">
              <h2>
                Minhas contas
                <span className="count-label">
                  {data.accounts.length.toString().padStart(2, "0")}
                </span>
              </h2>
              <Link href="/accounts">
                Gerenciar
                <ChevronRight size={14} />
              </Link>
            </div>
            {data.accounts.length ? (
              <div className="account-mini-grid">
                {data.accounts.slice(0, 4).map((a) => (
                  <Link href="/accounts" className="account-mini" key={a.id}>
                    <span
                      className="account-mini-icon"
                      style={{ color: a.color, background: `${a.color}18` }}
                    >
                      <Icon name={a.icon} size={19} />
                    </span>
                    <div>
                      <span>{a.name}</span>
                      <strong>{visible ? money(a.balance) : "••••"}</strong>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <button
                className="add-account-card"
                onClick={() => setEditor({ type: "account" })}
              >
                <span className="dashed-icon">
                  <Plus size={19} />
                </span>
                <span>
                  Seu dinheiro merece um lugar.
                  <small>Adicione sua primeira conta</small>
                </span>
                <ArrowUpRight size={19} />
              </button>
            )}
          </section>
        </div>
        <aside className="dashboard-secondary">
          <section className="summary-panel">
            <div className="section-heading">
              <h2>Seu mês em resumo</h2>
              <CalendarDays size={17} />
            </div>
            <span className="month-label">{currentMonth}</span>
            <div className="summary-row">
              <span className="summary-icon income">
                <ArrowDownLeft size={21} />
              </span>
              <div>
                <span>Receitas</span>
                <strong>{visible ? money(summary.income) : "••••"}</strong>
              </div>
              <ArrowUpRight className="summary-decoration" size={17} />
            </div>
            <div className="summary-row">
              <span className="summary-icon expense">
                <ArrowUpRight size={21} />
              </span>
              <div>
                <span>Despesas</span>
                <strong>{visible ? money(summary.expense) : "••••"}</strong>
              </div>
              <ArrowUpRight className="summary-decoration" size={17} />
            </div>
            <div className="summary-result">
              <span>Resultado do mês</span>
              <strong className={summary.result < 0n ? "text-red" : ""}>
                {visible ? money(summary.result) : "••••"}
              </strong>
            </div>
          </section>
          <section className="reserve-panel">
            <span className="reserve-icon">
              <PiggyBank size={25} strokeWidth={1.4} />
            </span>
            <div>
              <span>Dinheiro guardado</span>
              <strong>{visible ? money(summary.reserve) : "••••"}</strong>
              <small>Saldo das suas contas de reserva</small>
            </div>
            <span className="reserve-light" />
          </section>
          <section className="category-summary">
            <div className="section-heading">
              <h2>Para onde vai seu dinheiro</h2>
              <Link href="/statistics" aria-label="Ver estatísticas">
                <ArrowUpRight size={18} />
              </Link>
            </div>
            {expenseCategories.length ? (
              <div className="category-preview-list">
                {expenseCategories.map((c) => (
                  <div className="category-preview" key={c.id}>
                    <span className="category-preview-icon">
                      <Icon name={c.icon} size={19} />
                    </span>
                    <div>
                      <span>{c.name}</span>
                      <div className="category-track">
                        <i
                          style={{
                            width: `${Number((c.total * 100n) / (summary.expense || 1n))}%`,
                          }}
                        />
                      </div>
                    </div>
                    <strong>{visible ? money(c.total) : "••••"}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="category-summary-empty">
                <div className="empty-ring">
                  <Wallet size={21} />
                </div>
                <p>Cada gasto conta uma história.</p>
                <small>
                  Suas categorias aparecerão aqui
                  <br />
                  quando você registrar uma despesa.
                </small>
              </div>
            )}
          </section>
          <div className="quiet-message">
            <ShieldCheck size={15} />
            <span>Mais clareza. Mais tranquilidade. Mais você.</span>
          </div>
        </aside>
      </div>
      {!configured && (
        <button
          className="setup-banner"
          onClick={() => setEditor({ type: "setup" })}
        >
          <span className="setup-badge" />
          <span>
            Seu Fluxo está quase pronto.
            <small>Configure sua conexão para começar.</small>
          </span>
          <ArrowRight size={18} />
        </button>
      )}
      <Dialog open={notifications} onOpenChange={setNotifications}>
        <DialogContent>
          <div className="dialog-heading-icon">
            <Bell size={24} />
          </div>
          <DialogTitle className="dialog-title">
            Um espaço mais tranquilo
          </DialogTitle>
          <DialogDescription className="dialog-description">
            Notificações ainda não estão disponíveis nesta versão. Suas
            movimentações e resumos ficam sempre no aplicativo.
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
}
