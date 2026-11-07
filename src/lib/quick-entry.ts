import { localDateTime, shiftDay, toInstant } from "./dates";
import { moneyInput, parseMoney } from "./money";
import type {
  Category,
  FinancialAccount,
  TransactionKind,
} from "../types/finance";

export type QuickDraft = {
  kind: TransactionKind | "";
  amount: string;
  description: string;
  accountId: string;
  categoryId: string;
  destinationAccountId: string;
  occurredAt: string;
};
export type ManualFields = Partial<Record<keyof QuickDraft, boolean>>;

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function uniqueMatch<T extends { id: string; name: string }>(
  text: string,
  items: T[],
) {
  const matches = items.filter((item) => {
    const name = normalize(item.name).trim();
    // Whole names only: never guess from a substring or a synonym.
    return (
      name.length > 1 &&
      ` ${text.replace(/[^\p{L}\p{N}]+/gu, " ")} `.includes(
        ` ${name.replace(/[^\p{L}\p{N}]+/gu, " ")} `,
      )
    );
  });
  return matches.length === 1 ? matches[0] : undefined;
}

export function interpretQuickEntry(
  text: string,
  accounts: FinancialAccount[],
  categories: Category[],
  now = new Date(),
): QuickDraft {
  const normalized = normalize(text);
  const income = /\b(recebi|ganhei|receita|recebimento)\b/.test(normalized);
  const expense = /\b(gastei|paguei|comprei|despesa|gasto)\b/.test(normalized);
  const transfer = /\b(transferi|transferencia|transferir)\b/.test(normalized);
  const kind =
    Number(income) + Number(expense) + Number(transfer) === 1
      ? income
        ? "income"
        : expense
          ? "expense"
          : "transfer"
      : "";
  let occurredAt = localDateTime(now);
  const dates = [...normalized.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)];
  const date = dates[0];
  const dateHints = [
    ...normalized.matchAll(/\b(hoje|ontem|amanha|anteontem)\b/g),
  ];
  if (dates.length + dateHints.length > 1) {
    occurredAt = "";
  } else if (date) {
    occurredAt = `${date[3]}-${date[2].padStart(2, "0")}-${date[1].padStart(2, "0")}T${occurredAt.split("T")[1]}`;
    try {
      toInstant(occurredAt);
    } catch {
      occurredAt = "";
    }
  } else if (/\bontem\b/.test(normalized)) {
    occurredAt = `${shiftDay(occurredAt.slice(0, 10), -1)}T${occurredAt.split("T")[1]}`;
  } else if (
    /\b(amanha|anteontem|segunda|terca|quarta|quinta|sexta|sabado|domingo)\b|\bdia\s+\d+\b|\b\d{1,2}\/\d{1,2}\b/.test(
      normalized,
    )
  ) {
    occurredAt = "";
  }
  const account = uniqueMatch(
    normalized,
    accounts.filter((a) => a.active),
  );
  const category =
    kind && kind !== "transfer"
      ? uniqueMatch(
          normalized,
          categories.filter((c) => c.kind === kind),
        )
      : undefined;
  let withoutDates = normalized
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{4})?\b/g, " ")
    .replace(/\bdescricao\s*:[^;\n]+/g, " ")
    .replace(/\bdia\s+\d+\b/g, " ");
  // A number inside a matched account/category name is not a monetary value.
  for (const reference of [account, category]) {
    if (reference)
      withoutDates = withoutDates.replace(normalize(reference.name), " ");
  }
  const amounts = [
    ...withoutDates.matchAll(
      /(?<![\p{L}\p{N},.])[-+]?\d[\d.,]*(?![\p{L}\p{N}])/gu,
    ),
  ];
  let amount = "";
  if (amounts.length === 1) {
    try {
      const cents = parseMoney(amounts[0][0]);
      if (cents > 0n) amount = moneyInput(cents);
    } catch {
      /* An ambiguous or invalid number stays unfilled. */
    }
  }
  const description =
    text.match(/\bdescri[çc][aã]o\s*:\s*([^;\n]+)/i)?.[1].trim() ?? "";
  return {
    kind,
    amount,
    description,
    accountId: account?.id ?? "",
    categoryId: category?.id ?? "",
    destinationAccountId: "",
    occurredAt,
  };
}

export function mergeQuickDraft(
  current: QuickDraft,
  interpreted: QuickDraft,
  manual: ManualFields,
  accounts: FinancialAccount[],
  categories: Category[],
  reinterpret = false,
): QuickDraft {
  const next = { ...interpreted };
  if (!reinterpret) {
    for (const key of Object.keys(next) as Array<keyof QuickDraft>) {
      if (manual[key]) Object.assign(next, { [key]: current[key] });
    }
  }
  if (!accounts.some((a) => a.id === next.accountId && a.active))
    next.accountId = "";
  if (next.kind === "transfer") next.categoryId = "";
  else {
    next.destinationAccountId = "";
    if (
      !categories.some((c) => c.id === next.categoryId && c.kind === next.kind)
    )
      next.categoryId = "";
  }
  if (
    next.destinationAccountId === next.accountId ||
    !accounts.some((a) => a.id === next.destinationAccountId && a.active)
  )
    next.destinationAccountId = "";
  return next;
}
