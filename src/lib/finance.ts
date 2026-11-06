import type { FinancialAccount, Transaction } from "@/types/finance";
import { localDate, shiftDay } from "./dates";
export function calculateBalance(
  account: Pick<FinancialAccount, "id" | "initialBalance">,
  transactions: Transaction[],
): bigint {
  return transactions.reduce((balance, t) => {
    const amount = BigInt(t.amount);
    if (t.accountId === account.id)
      balance += t.kind === "income" ? amount : -amount;
    if (t.kind === "transfer" && t.destinationAccountId === account.id)
      balance += amount;
    return balance;
  }, BigInt(account.initialBalance));
}
export function summarize(
  accounts: FinancialAccount[],
  transactions: Transaction[],
  now = new Date(),
) {
  const month = localDate(now).slice(0, 7);
  const monthly = transactions.filter((t) =>
    localDate(t.occurredAt).startsWith(month),
  );
  const income = monthly
    .filter((t) => t.kind === "income")
    .reduce((v, t) => v + BigInt(t.amount), 0n);
  const expense = monthly
    .filter((t) => t.kind === "expense")
    .reduce((v, t) => v + BigInt(t.amount), 0n);
  return {
    total: accounts.reduce((v, a) => v + BigInt(a.balance), 0n),
    reserve: accounts
      .filter((a) => a.type === "reserve")
      .reduce((v, a) => v + BigInt(a.balance), 0n),
    income,
    expense,
    result: income - expense,
    hasMonthlyData: monthly.some((t) => t.kind !== "transfer"),
  };
}
export type Period = "daily" | "weekly" | "monthly";
export function expenseBuckets(
  transactions: Transaction[],
  period: Period,
  now = new Date(),
) {
  const today = localDate(now);
  const month = today.slice(0, 7);
  const currentMonday = shiftDay(
    today,
    -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7),
  );
  const buckets =
    period === "daily"
      ? Array.from({ length: 7 }, (_, i) => {
          const start = shiftDay(currentMonday, i);
          return {
            start,
            end: start,
            label: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][i],
          };
        })
      : period === "weekly"
        ? Array.from({ length: 4 }, (_, i) => {
            const start = shiftDay(currentMonday, (i - 3) * 7);
            return {
              start,
              end: shiftDay(start, 6),
              label: `${start.slice(8)}/${start.slice(5, 7)}`,
            };
          })
        : Array.from({ length: 6 }, (_, i) => {
            const d = new Date(`${month}-15T12:00:00Z`);
            d.setUTCMonth(d.getUTCMonth() + i - 5);
            const start = `${d.toISOString().slice(0, 7)}-01`;
            const next = new Date(`${start}T12:00:00Z`);
            next.setUTCMonth(next.getUTCMonth() + 1);
            return {
              start,
              end: shiftDay(next.toISOString().slice(0, 10), -1),
              label: new Intl.DateTimeFormat("pt-BR", {
                month: "short",
                timeZone: "UTC",
              })
                .format(d)
                .replace(".", ""),
            };
          });
  return buckets.map((bucket) => ({
    ...bucket,
    amount: transactions
      .filter((t) => {
        const date = localDate(t.occurredAt);
        return (
          t.kind === "expense" && date >= bucket.start && date <= bucket.end
        );
      })
      .reduce((n, t) => n + BigInt(t.amount), 0n)
      .toString(),
  }));
}
