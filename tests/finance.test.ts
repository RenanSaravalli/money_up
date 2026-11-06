import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMoney, money } from "../src/lib/money";
import {
  calculateBalance,
  summarize,
  expenseBuckets,
} from "../src/lib/finance";
import { toInstant, localDate, localDateTime } from "../src/lib/dates";
import { transactionSchema, cardSchema } from "../src/lib/validation";
import type { Transaction, FinancialAccount } from "../src/types/finance";
const a = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
  b = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
  category = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const now = new Date("2026-11-05T15:00:00Z");
const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: crypto.randomUUID(),
  kind: "expense",
  amount: "100",
  description: "Teste",
  accountId: a,
  destinationAccountId: null,
  categoryId: category,
  occurredAt: now.toISOString(),
  notes: null,
  ...overrides,
});
const account = (
  id = a,
  initialBalance = "0",
  type: FinancialAccount["type"] = "checking",
): FinancialAccount => ({
  id,
  name: "Teste",
  type,
  initialBalance,
  balance: initialBalance,
  icon: "wallet",
  color: "#2F78FF",
  active: true,
});
test("conversão e formatação BRL preservam os centavos exatos", () => {
  assert.equal(parseMoney("R$ 1.250,09"), 125009n);
  assert.equal(parseMoney("0,1"), 10n);
  assert.equal(parseMoney("-12,34", true), -1234n);
  assert.equal(money(900719925474099312n), "R$ 9.007.199.254.740.993,12");
  assert.equal(parseMoney("0,10") + parseMoney("0,20"), 30n);
});
test("valores ambíguos, negativos e acima do limite são recusados", () => {
  for (const value of [
    "1.25",
    "1,000",
    "-2,00",
    "NaN",
    "1e8",
    "1.23,00",
    "90.000.000.000,01",
    "",
  ])
    assert.throws(() => parseMoney(value));
});
test("receita e despesa alteram o saldo, com edição e exclusão reversíveis", () => {
  const income = transaction({ kind: "income", amount: "100000" }),
    expense = transaction({ amount: "7501" });
  assert.equal(calculateBalance(account(a, "1000"), [income, expense]), 93499n);
  assert.equal(
    calculateBalance(account(a, "1000"), [
      income,
      { ...expense, amount: "5001" },
    ]),
    95999n,
  );
  assert.equal(calculateBalance(account(a, "1000"), [income]), 101000n);
});
test("transferência conserva o total e movimenta as duas contas", () => {
  const txs = [
    transaction({
      kind: "transfer",
      amount: "25000",
      categoryId: null,
      destinationAccountId: b,
    }),
  ];
  assert.equal(calculateBalance(account(a, "50000"), txs), 25000n);
  assert.equal(calculateBalance(account(b, "30000"), txs), 55000n);
  assert.equal(
    calculateBalance(account(a, "50000"), txs) +
      calculateBalance(account(b, "30000"), txs),
    80000n,
  );
  const result = summarize(
    [account(a, "25000"), account(b, "55000", "reserve")],
    txs,
    now,
  );
  assert.equal(result.income, 0n);
  assert.equal(result.expense, 0n);
  assert.equal(result.reserve, 55000n);
  assert.equal(result.total, 80000n);
});
test("resultado mensal usa São Paulo e ignora transferências e outros meses", () => {
  const txs = [
    transaction({ kind: "income", amount: "10000" }),
    transaction({ amount: "1234" }),
    transaction({ amount: "99999", occurredAt: "2026-11-01T01:59:00Z" }),
    transaction({
      amount: "88888",
      kind: "transfer",
      categoryId: null,
      destinationAccountId: b,
    }),
  ];
  const result = summarize([], txs, now);
  assert.equal(result.income, 10000n);
  assert.equal(result.expense, 1234n);
  assert.equal(result.result, 8766n);
  assert.equal(localDate("2026-11-01T01:59:00Z"), "2026-10-31");
});
test("gráfico agrupa por dia, semana e mês sem transferências", () => {
  const txs = [
    transaction({ amount: "199" }),
    transaction({ amount: "101" }),
    transaction({
      kind: "transfer",
      amount: "10000",
      categoryId: null,
      destinationAccountId: b,
    }),
  ];
  for (const period of ["daily", "weekly", "monthly"] as const)
    assert.equal(
      expenseBuckets(txs, period, now).reduce(
        (sum, b) => sum + BigInt(b.amount),
        0n,
      ),
      300n,
    );
  assert.equal(expenseBuckets(txs, "daily", now)[3].amount, "300");
});
test("horários são convertidos pelo fuso de São Paulo, inclusive horário de verão histórico", () => {
  assert.equal(toInstant("2026-11-05T12:30"), "2026-11-05T15:30:00.000Z");
  assert.equal(toInstant("2018-12-05T12:30"), "2018-12-05T14:30:00.000Z");
  assert.throws(() => toInstant("2026-02-31T12:00"));
  assert.equal(localDateTime(now), "2026-11-05T12:00");
});
test("validação rejeita transferências para a mesma conta, valor zero e categoria ausente", () => {
  const valid = {
    id: crypto.randomUUID(),
    kind: "expense",
    amount: "1,00",
    description: "Almoço",
    categoryId: category,
    accountId: a,
    destinationAccountId: "",
    occurredAt: "2026-01-01T12:00",
    notes: "",
  };
  assert.equal(transactionSchema.safeParse(valid).success, true);
  assert.equal(
    transactionSchema.safeParse({ ...valid, amount: "0,00" }).success,
    false,
  );
  assert.equal(
    transactionSchema.safeParse({ ...valid, categoryId: "" }).success,
    false,
  );
  assert.equal(
    transactionSchema.safeParse({
      ...valid,
      kind: "transfer",
      categoryId: "",
      destinationAccountId: a,
    }).success,
    false,
  );
  assert.equal(
    transactionSchema.safeParse({
      ...valid,
      kind: "transfer",
      categoryId: "",
      destinationAccountId: b,
    }).success,
    true,
  );
});
test("cadastro de crédito exige limite e dias válidos", () => {
  const card = {
    name: "Principal",
    institution: "Banco",
    type: "credit",
    accountId: a,
    color: "#2F78FF",
    limit: "1000,00",
    closingDay: "5",
    dueDay: "12",
  };
  assert.equal(cardSchema.safeParse(card).success, true);
  assert.equal(cardSchema.safeParse({ ...card, dueDay: "32" }).success, false);
  assert.equal(cardSchema.safeParse({ ...card, limit: "0" }).success, false);
  assert.equal(
    cardSchema.safeParse({
      ...card,
      type: "debit",
      limit: "",
      closingDay: "",
      dueDay: "",
    }).success,
    true,
  );
});
