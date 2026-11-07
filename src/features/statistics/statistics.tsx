"use client";
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ArrowUpRight, ChartNoAxesColumn, ChevronRight } from "lucide-react";
import { useFinance } from "@/components/finance-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Icon } from "@/components/icons";
import { TransactionList } from "@/components/transaction-list";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { expenseBuckets, type Period } from "@/lib/finance";
import { money } from "@/lib/money";
import { localDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
export function Statistics() {
  const { data } = useFinance();
  const [period, setPeriod] = useState<Period>("daily"),
    [selected, setSelected] = useState<number | null>(null),
    [details, setDetails] = useState(false),
    [options, setOptions] = useState(false);
  const buckets = expenseBuckets(data.transactions, period),
    chosen = selected === null ? null : buckets[selected];
  const start = chosen?.start ?? buckets[0].start,
    end = chosen?.end ?? buckets[buckets.length - 1].end;
  const filtered = data.transactions.filter(
    (t) =>
      t.kind === "expense" &&
      localDate(t.occurredAt) >= start &&
      localDate(t.occurredAt) <= end,
  );
  const total = filtered.reduce((v, t) => v + BigInt(t.amount), 0n),
    max = buckets.reduce(
      (v, b) => (BigInt(b.amount) > v ? BigInt(b.amount) : v),
      0n,
    );
  const chartData = buckets.map((b) => ({
    ...b,
    value: max ? Number((BigInt(b.amount) * 10000n) / max) / 100 : 0,
  }));
  const cats = data.categories
    .filter((c) => c.kind === "expense")
    .map((c) => ({
      ...c,
      total: filtered
        .filter((t) => t.categoryId === c.id)
        .reduce((v, t) => v + BigInt(t.amount), 0n),
    }))
    .filter((c) => c.total > 0n)
    .sort((a, b) => (a.total > b.total ? -1 : 1));
  const shortDate = (date: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${date}T12:00:00Z`));
  const rangeLabel =
    start === end
      ? new Intl.DateTimeFormat("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(`${start}T12:00:00Z`))
      : `${shortDate(start)} — ${shortDate(end)} de ${end.slice(0, 4)}`;
  return (
    <div className="statistics-page">
      <PageHeader
        title="Estatísticas"
        eyebrow="ENTENDA SEU DINHEIRO"
        options={() => setOptions(true)}
      />
      <div className="statistics-layout">
        <div className="statistics-main">
          <div className="segmented-control">
            {(
              [
                ["daily", "Diário"],
                ["weekly", "Semanal"],
                ["monthly", "Mensal"],
              ] as const
            ).map(([value, label]) => (
              <button
                className={cn(period === value && "active")}
                key={value}
                onClick={() => {
                  setPeriod(value);
                  setSelected(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <section className="chart-card">
            <span className="chart-eyebrow">
              {chosen ? "DESPESAS NO PERÍODO" : "TOTAL DE DESPESAS"}
            </span>
            <h2>{money(total)}</h2>
            <p className="chart-date">{rangeLabel}</p>
            <div
              className="bar-chart"
              role="group"
              aria-label="Gráfico de despesas por período"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 15, right: 0, left: 0, bottom: 0 }}
                  barCategoryGap="14%"
                  accessibilityLayer
                >
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#8d91a6", fontSize: 11 }}
                    dy={9}
                    height={33}
                  />
                  <YAxis hide domain={[0, 100]} />
                  <Bar
                    dataKey="value"
                    radius={[8, 8, 8, 8]}
                    maxBarSize={64}
                    minPointSize={(value) => ((value ?? 0) > 0 ? 3 : 0)}
                    background={
                      max === 0n
                        ? { fill: "var(--chart-empty-bar)", radius: 8 }
                        : false
                    }
                    onClick={(_, index) =>
                      setSelected(selected === index ? null : index)
                    }
                    isAnimationActive={false}
                  >
                    {chartData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={
                          selected === i ? "url(#barBlue)" : "var(--chart-bar)"
                        }
                        cursor="pointer"
                      />
                    ))}
                  </Bar>
                  <defs>
                    <linearGradient id="barBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-blue-top)" />
                      <stop
                        offset="100%"
                        stopColor="var(--chart-blue-bottom)"
                      />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
              {max === 0n && (
                <div className="chart-empty-overlay">
                  <ChartNoAxesColumn size={25} />
                  <span>Ainda sem despesas neste período</span>
                </div>
              )}
            </div>
            <div className="chart-accessible-controls">
              {buckets.map((b, i) => (
                <button
                  key={b.start}
                  aria-label={`${b.label}: ${money(b.amount)}`}
                  aria-pressed={selected === i}
                  onClick={() => setSelected(selected === i ? null : i)}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </section>
          <button className="chart-hint" onClick={() => setDetails(true)}>
            Toque em uma barra para explorar seus gastos
            <ChevronRight size={13} />
          </button>
          {chosen && (
            <button
              className="reset-chart text-action"
              onClick={() => setSelected(null)}
            >
              Ver período completo
            </button>
          )}
        </div>
        <section className="statistics-categories">
          <div className="section-heading">
            <h2>Gastos por categoria</h2>
            <span className="period-pill">
              {chosen ? "Selecionado" : "No período"}
            </span>
          </div>
          {cats.length ? (
            cats.map((c) => (
              <button
                className="category-expense-card"
                key={c.id}
                onClick={() => setDetails(true)}
              >
                <span className="transaction-icon">
                  <Icon name={c.icon} size={22} />
                </span>
                <span>
                  <strong>{c.name}</strong>
                  <small>Total: {money(c.total)}</small>
                </span>
                <span className="category-percentage">
                  {Number((c.total * 1000n) / (total || 1n)) / 10}%
                  <ArrowUpRight size={12} />
                </span>
              </button>
            ))
          ) : (
            <div className="statistics-empty">
              <div className="empty-ring">
                <ChartNoAxesColumn size={25} />
              </div>
              <h3>Clareza em cada categoria</h3>
              <p>
                Registre suas despesas para descobrir
                <br />
                para onde seu dinheiro está indo.
              </p>
              <span className="empty-period">Nenhuma despesa no período</span>
            </div>
          )}
          <div className="statistics-note">
            <span className="subtle-dot" />
            Transferências não entram nos seus gastos.
          </div>
        </section>
      </div>
      <Dialog open={details} onOpenChange={setDetails}>
        <DialogContent>
          <DialogTitle className="dialog-title">
            Despesas do período
          </DialogTitle>
          <DialogDescription className="dialog-description">
            {rangeLabel} · {money(total)}
          </DialogDescription>
          {filtered.length ? (
            <TransactionList transactions={filtered} />
          ) : (
            <p className="dialog-description">Nenhuma despesa neste período.</p>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={options} onOpenChange={setOptions}>
        <DialogContent>
          <DialogTitle className="dialog-title">
            Sobre suas estatísticas
          </DialogTitle>
          <DialogDescription className="dialog-description">
            Diário mostra os dias desta semana. Semanal compara as últimas
            quatro semanas. Mensal reúne os últimos seis meses. Toque nas barras
            para selecionar um período. Os percentuais das categorias
            representam a participação no total de despesas, não uma variação.
          </DialogDescription>
          <p className="dialog-description">
            Todos os horários usam o fuso de São Paulo. Transferências entre
            suas contas ficam fora dos cálculos de receitas e despesas.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
