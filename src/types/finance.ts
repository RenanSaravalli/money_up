export type TransactionKind = "income" | "expense" | "transfer";
export type FinancialAccount = {
  id: string;
  name: string;
  type: "checking" | "cash" | "reserve";
  initialBalance: string;
  balance: string;
  icon: string;
  color: string;
  active: boolean;
};
export type Category = {
  id: string;
  name: string;
  kind: "income" | "expense";
  icon: string;
};
export type Transaction = {
  id: string;
  kind: TransactionKind;
  amount: string;
  description: string;
  categoryId: string | null;
  accountId: string;
  destinationAccountId: string | null;
  occurredAt: string;
  notes: string | null;
};
export type Card = {
  id: string;
  name: string;
  institution: string;
  type: "credit" | "debit";
  limit: string | null;
  closingDay: number | null;
  dueDay: number | null;
  accountId: string;
  color: string;
};
export type Snapshot = {
  accounts: FinancialAccount[];
  categories: Category[];
  transactions: Transaction[];
  cards: Card[];
};
export const emptySnapshot: Snapshot = {
  accounts: [],
  categories: [],
  transactions: [],
  cards: [],
};
