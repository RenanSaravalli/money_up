import test from "node:test";
import assert from "node:assert/strict";
import { interpretQuickEntry, mergeQuickDraft } from "../src/lib/quick-entry";
import { transactionSchema } from "../src/lib/validation";
import type { Category, FinancialAccount } from "../src/types/finance";

const accountId = "11111111-1111-4111-8111-111111111111";
const categoryId = "22222222-2222-4222-8222-222222222222";
const incomeId = "33333333-3333-4333-8333-333333333333";
const accounts: FinancialAccount[] = [
  {
    id: accountId,
    name: "Bradesco",
    active: true,
    type: "checking",
    initialBalance: "0",
    balance: "0",
    icon: "bank",
    color: "#123456",
  },
];
const categories: Category[] = [
  { id: categoryId, name: "Alimentação", kind: "expense", icon: "food" },
  { id: incomeId, name: "Salário", kind: "income", icon: "banknote" },
];
const now = new Date("2026-11-07T01:30:00Z");
const parse = (text: string) =>
  interpretQuickEntry(text, accounts, categories, now);

test("números em nomes ou descrições não são interpretados como valor", () => {
  const numbered = [{ ...accounts[0], name: "Conta 123" }];
  assert.equal(
    interpretQuickEntry("Gastei na Conta 123", numbered, categories, now)
      .amount,
    "",
  );
  assert.equal(
    interpretQuickEntry("Gastei 29 na Conta 123", numbered, categories, now)
      .amount,
    "29,00",
  );
  assert.equal(parse("Gastei dia 5").amount, "");
  assert.equal(parse("Gastei dia 5").occurredAt, "");
  assert.equal(parse("Gastei 29 descrição: Pedido 123").amount, "29,00");
  assert.equal(parse("Gastei 29 hoje ontem").occurredAt, "");
});

test("frase curta preenche somente despesa, centavos e data de São Paulo", () => {
  assert.deepEqual(parse("Gastei 29,3"), {
    kind: "expense",
    amount: "29,30",
    description: "",
    occurredAt: "2026-11-06T22:30",
    categoryId: "",
    accountId: "",
    destinationAccountId: "",
  });
});

test("somente referências únicas e reais podem preencher conta e categoria", () => {
  const draft = parse("Gastei 29,3 em alimentação no Bradesco");
  assert.equal(draft.accountId, accountId);
  assert.equal(draft.categoryId, categoryId);
  assert.equal(
    parse("Gastei 29,3 no banco desconhecido para comer").categoryId,
    "",
  );
  assert.equal(parse("Gastei 29,3 no banco desconhecido").accountId, "");
  assert.equal(
    interpretQuickEntry(
      "Gastei 29 no Bradesco",
      [...accounts, { ...accounts[0], id: incomeId }],
      categories,
      now,
    ).accountId,
    "",
  );
  assert.equal(
    interpretQuickEntry(
      "Gastei 29 no Bradesco",
      [{ ...accounts[0], active: false }],
      categories,
      now,
    ).accountId,
    "",
  );
  assert.equal(parse("Gastei 29 no Bradescos").accountId, "");
});

test("números ambíguos, valores inválidos e tipos conflitantes ficam pendentes", () => {
  for (const text of [
    "Gastei 10 e 20",
    "Gastei -29",
    "Gastei 29,333",
    "Gastei 29.30",
    "Gastei 0",
  ])
    assert.equal(parse(text).amount, "", text);
  assert.equal(parse("Recebi e gastei 29").kind, "");
  assert.equal(parse("29,3").kind, "");
  assert.equal(parse("Gastei").amount, "");
});

test("datas explícitas não viram valores e datas desconhecidas precisam de revisão", () => {
  assert.equal(parse("Gastei 29 ontem").occurredAt, "2026-11-05T22:30");
  assert.equal(parse("Gastei 29 em 05/11/2026").amount, "29,00");
  assert.equal(parse("Gastei 29 em 05/11/2026").occurredAt, "2026-11-05T22:30");
  assert.equal(parse("Gastei 29 em 31/02/2026").occurredAt, "");
  assert.equal(parse("Gastei 29 segunda").occurredAt, "");
});

test("edição contínua preserva campos manuais; nova interpretação pode substituí-los", () => {
  const current = {
    ...parse("Gastei 29"),
    accountId,
    categoryId,
    description: "Meu almoço",
    amount: "40,00",
  };
  const manual = {
    accountId: true,
    categoryId: true,
    description: true,
    amount: true,
  };
  const next = mergeQuickDraft(
    current,
    parse("Gastei 35"),
    manual,
    accounts,
    categories,
  );
  assert.equal(next.accountId, accountId);
  assert.equal(next.categoryId, categoryId);
  assert.equal(next.description, "Meu almoço");
  assert.equal(next.amount, "40,00");
  const reset = mergeQuickDraft(
    current,
    parse("Gastei 35"),
    manual,
    accounts,
    categories,
    true,
  );
  assert.equal(reset.categoryId, "");
  assert.equal(reset.accountId, "");
  assert.equal(reset.amount, "35,00");
});

test("mudança de tipo limpa categoria incompatível e contas removidas não são mantidas", () => {
  const current = { ...parse("Gastei 29"), accountId, categoryId };
  const next = mergeQuickDraft(
    current,
    parse("Recebi 30"),
    { accountId: true, categoryId: true },
    accounts,
    categories,
  );
  assert.equal(next.kind, "income");
  assert.equal(next.categoryId, "");
  assert.equal(next.accountId, accountId);
  assert.equal(
    mergeQuickDraft(
      current,
      parse("Gastei 30"),
      { accountId: true },
      [],
      categories,
    ).accountId,
    "",
  );
});

test("schema compartilhado permite descrição vazia, mas exige conta, categoria, tipo e valor", () => {
  const partial = { ...parse("Gastei 29,3"), id: incomeId };
  assert.equal(transactionSchema.safeParse(partial).success, false);
  const complete = { ...partial, accountId, categoryId };
  const result = transactionSchema.safeParse(complete);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.amount, "2930");
    assert.equal(result.data.description, "");
  }
  for (const missing of [
    "kind",
    "amount",
    "accountId",
    "categoryId",
    "occurredAt",
  ])
    assert.equal(
      transactionSchema.safeParse({ ...complete, [missing]: "" }).success,
      false,
    );
});
