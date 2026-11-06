import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  bigint,
  integer,
  index,
  unique,
  check,
  foreignKey,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};
export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  ...timestamps,
});
export const session = pgTable(
  "session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("session_user_idx").on(t.userId)],
);
export const account = pgTable(
  "account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [
    index("auth_account_user_idx").on(t.userId),
    unique("provider_account_unique").on(t.providerId, t.accountId),
  ],
);
export const verification = pgTable(
  "verification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);
export const rateLimit = pgTable("rate_limit", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
export const transactionKind = pgEnum("transaction_kind", [
  "income",
  "expense",
  "transfer",
]);
export const financialAccounts = pgTable(
  "financial_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(),
    initialBalance: bigint("initial_balance", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    icon: text("icon").notNull().default("wallet"),
    color: text("color").notNull().default("#2F78FF"),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    unique("financial_account_owner").on(t.id, t.userId),
    index("financial_accounts_user_idx").on(t.userId),
    check(
      "account_type_check",
      sql`${t.type} in ('checking', 'cash', 'reserve')`,
    ),
    check(
      "initial_balance_limit",
      sql`${t.initialBalance} between -9000000000000 and 9000000000000`,
    ),
  ],
);
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: transactionKind("kind").notNull(),
    icon: text("icon").notNull().default("tag"),
    ...timestamps,
  },
  (t) => [
    unique("category_owner_kind").on(t.id, t.userId, t.kind),
    unique("category_name_owner").on(t.userId, t.name, t.kind),
    check("category_kind_check", sql`${t.kind} in ('income', 'expense')`),
  ],
);
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: transactionKind("kind").notNull(),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    description: text("description").notNull(),
    categoryId: uuid("category_id"),
    accountId: uuid("account_id").notNull(),
    destinationAccountId: uuid("destination_account_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("transactions_user_date_idx").on(t.userId, t.occurredAt),
    index("transactions_account_idx").on(t.accountId),
    index("transactions_destination_idx").on(t.destinationAccountId),
    index("transactions_category_idx").on(t.categoryId),
    foreignKey({
      columns: [t.accountId, t.userId],
      foreignColumns: [financialAccounts.id, financialAccounts.userId],
      name: "transaction_account_owner_fk",
    }),
    foreignKey({
      columns: [t.destinationAccountId, t.userId],
      foreignColumns: [financialAccounts.id, financialAccounts.userId],
      name: "transaction_destination_owner_fk",
    }),
    foreignKey({
      columns: [t.categoryId, t.userId, t.kind],
      foreignColumns: [categories.id, categories.userId, categories.kind],
      name: "transaction_category_owner_kind_fk",
    }),
    check(
      "positive_amount",
      sql`${t.amount} > 0 and ${t.amount} <= 9000000000000`,
    ),
    check(
      "transfer_shape",
      sql`(${t.kind} = 'transfer' and ${t.destinationAccountId} is not null and ${t.destinationAccountId} <> ${t.accountId} and ${t.categoryId} is null) or (${t.kind} <> 'transfer' and ${t.destinationAccountId} is null and ${t.categoryId} is not null)`,
    ),
  ],
);
export const cards = pgTable(
  "cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    institution: text("institution").notNull(),
    type: text("type").notNull(),
    limit: bigint("credit_limit", { mode: "bigint" }),
    closingDay: integer("closing_day"),
    dueDay: integer("due_day"),
    accountId: uuid("account_id").notNull(),
    color: text("color").notNull().default("#2F78FF"),
    ...timestamps,
  },
  (t) => [
    index("cards_user_idx").on(t.userId),
    foreignKey({
      columns: [t.accountId, t.userId],
      foreignColumns: [financialAccounts.id, financialAccounts.userId],
      name: "card_account_owner_fk",
    }),
    check("card_type_check", sql`${t.type} in ('credit', 'debit')`),
    check(
      "card_financial_fields",
      sql`(${t.type} = 'debit' and ${t.limit} is null and ${t.closingDay} is null and ${t.dueDay} is null) or (${t.type} = 'credit' and ${t.limit} is not null and ${t.limit} > 0 and ${t.limit} <= 9000000000000 and ${t.closingDay} is not null and ${t.closingDay} between 1 and 31 and ${t.dueDay} is not null and ${t.dueDay} between 1 and 31)`,
    ),
  ],
);
