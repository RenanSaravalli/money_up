"use client";
import { useRef, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  LoaderCircle,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ShieldCheck,
  Database,
  ArrowRight,
  Wallet,
  LogOut,
} from "lucide-react";
import { useFinance } from "@/components/finance-provider";
import { ThemeSelector } from "@/components/theme-provider";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  accountSchema,
  cardSchema,
  categorySchema,
  transactionSchema,
} from "@/lib/validation";
import { localDateTime } from "@/lib/dates";
import { moneyInput, parseMoney } from "@/lib/money";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  interpretQuickEntry,
  mergeQuickDraft,
  type ManualFields,
  type QuickDraft,
} from "@/lib/quick-entry";
import type {
  FinancialAccount,
  Transaction,
  TransactionKind,
  Card,
  Category,
} from "@/types/finance";

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("form-field", className)}>
      <span>{label}</span>
      {children}
      {error && (
        <small className="field-error" role="alert">
          {error}
        </small>
      )}
    </label>
  );
}
function FormNotice() {
  const { configured, setEditor } = useFinance();
  return !configured ? (
    <div className="form-setup-note">
      <Database size={17} />
      <span>
        Conecte o Neon e entre na sua conta para salvar.
        <button type="button" onClick={() => setEditor({ type: "setup" })}>
          Ver configuração
          <ArrowRight size={12} />
        </button>
      </span>
    </div>
  ) : null;
}
function useSave() {
  const { mutate, setEditor } = useFinance();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(resource: string, body: unknown, id?: string) {
    setBusy(true);
    setError("");
    try {
      await mutate(resource, id ? "PATCH" : "POST", body, id);
      toast.success(
        id ? "Alteração salva." : "Tudo certo. Registro adicionado!",
      );
      setEditor(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  return { save, busy, error };
}
function SaveFooter({
  busy,
  disabled = false,
  error,
  label = "Salvar",
  children,
}: {
  busy: boolean;
  disabled?: boolean;
  error: string;
  label?: string;
  children?: ReactNode;
}) {
  const { configured } = useFinance();
  return (
    <>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <FormNotice />
      <div className="form-footer">
        {children}
        <Button
          type="submit"
          disabled={busy || !configured || disabled}
          className="submit-button"
        >
          {busy ? (
            <LoaderCircle size={18} className="spin" />
          ) : (
            <ShieldCheck size={17} />
          )}{" "}
          {busy ? "Salvando…" : label}
        </Button>
      </div>
    </>
  );
}
function DeleteAction({
  resource,
  id,
  name,
}: {
  resource: string;
  id: string;
  name: string;
}) {
  const { mutate, setEditor } = useFinance();
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    try {
      await mutate(resource, "DELETE", {}, id);
      setEditor(null);
      toast.success("Registro excluído.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir.");
      setBusy(false);
    }
  }
  return confirm ? (
    <div className="delete-confirmation">
      <p>Excluir {name}? Esta ação não pode ser desfeita.</p>
      <div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setConfirm(false)}
          disabled={busy}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={remove}
          disabled={busy}
        >
          {busy ? "Excluindo…" : "Sim, excluir"}
        </Button>
      </div>
    </div>
  ) : (
    <button
      className="delete-button"
      type="button"
      onClick={() => setConfirm(true)}
      aria-label={`Excluir ${name}`}
    >
      <Trash2 size={18} />
    </button>
  );
}

// The normal flow keeps its original description requirement. The quick flow
// shares financial validation and persistence, but allows an empty description.
const normalTransactionSchema = transactionSchema.refine(
  (transaction) => transaction.description.length >= 2,
  { path: ["description"], message: "Use pelo menos 2 caracteres." },
);

function QuickEntryForm() {
  return <TransactionForm quick />;
}

function TransactionForm({
  value,
  initialKind,
  quick = false,
}: {
  value?: Transaction;
  initialKind?: TransactionKind;
  quick?: boolean;
}) {
  const { data, setEditor } = useFinance();
  const { save, busy, error } = useSave();
  const [id] = useState(() => value?.id ?? crypto.randomUUID());
  const [quickText, setQuickText] = useState("");
  const manual = useRef<ManualFields>({});
  const form = useForm<
    z.input<typeof transactionSchema>,
    unknown,
    z.output<typeof transactionSchema>
  >({
    resolver: zodResolver(quick ? transactionSchema : normalTransactionSchema),
    mode: quick ? "onChange" : "onSubmit",
    defaultValues: {
      id,
      kind: value?.kind ?? initialKind ?? (quick ? "" : "expense"),
      amount: value ? moneyInput(value.amount) : "",
      description: value?.description ?? "",
      categoryId: value?.categoryId ?? "",
      accountId:
        value?.accountId ??
        (quick ? "" : (data.accounts.find((a) => a.active)?.id ?? "")),
      destinationAccountId: value?.destinationAccountId ?? "",
      occurredAt: value ? localDateTime(value.occurredAt) : localDateTime(),
      notes: value?.notes ?? "",
    },
  });
  const kind = useWatch({ control: form.control, name: "kind" }),
    origin = useWatch({ control: form.control, name: "accountId" }),
    errors = form.formState.errors;
  const draft = useWatch({ control: form.control });
  const ready =
    transactionSchema.safeParse(draft).success &&
    data.accounts.some(
      (a) =>
        a.id === draft.accountId && (a.active || a.id === value?.accountId),
    ) &&
    (kind === "transfer"
      ? data.accounts.some(
          (a) =>
            a.id === draft.destinationAccountId &&
            (a.active || a.id === value?.destinationAccountId),
        )
      : data.categories.some(
          (c) => c.id === draft.categoryId && c.kind === kind,
        ));
  function interpret(text: string, reinterpret = false) {
    const result = interpretQuickEntry(text, data.accounts, data.categories);
    const current = form.getValues();
    const next = mergeQuickDraft(
      {
        ...current,
        categoryId: current.categoryId ?? "",
        destinationAccountId: current.destinationAccountId ?? "",
      },
      result,
      manual.current,
      data.accounts,
      data.categories,
      reinterpret,
    );
    if (reinterpret) manual.current = {};
    for (const key of Object.keys(next) as Array<keyof QuickDraft>) {
      // Inferred values do not mark a field as manually edited.
      if (
        reinterpret ||
        !manual.current[key] ||
        next[key] !== form.getValues(key)
      ) {
        if (key === "kind")
          form.setValue(key, next.kind, { shouldValidate: true });
        else form.setValue(key, next[key], { shouldValidate: true });
      }
    }
  }
  const activeAccounts = data.accounts.filter(
    (a) =>
      a.active ||
      (value &&
        (a.id === value.accountId || a.id === value.destinationAccountId)),
  );
  if (!activeAccounts.length)
    return (
      <>
        <div className="dialog-heading-icon">
          <Wallet size={25} />
        </div>
        <DialogTitle className="dialog-title">Primeiro, uma conta.</DialogTitle>
        <DialogDescription className="dialog-description">
          Adicione onde você guarda seu dinheiro. Depois, cada receita, despesa
          ou transferência terá o lugar certo.
        </DialogDescription>
        <Button
          onClick={() => setEditor({ type: "account" })}
          className="full-width"
        >
          Adicionar minha primeira conta
          <ArrowRight size={17} />
        </Button>
      </>
    );
  return (
    <>
      <DialogTitle className="dialog-title">
        {quick
          ? "Lançamento rápido"
          : value
            ? "Editar movimentação"
            : "Nova movimentação"}
      </DialogTitle>
      <DialogDescription className="dialog-description">
        {quick
          ? "Conte o que aconteceu e revise os campos antes de confirmar."
          : "Cada movimento deixa seu dinheiro mais claro."}
      </DialogDescription>
      <form
        onSubmit={form.handleSubmit(() =>
          save("transactions", form.getValues(), value?.id),
        )}
        className="finance-form"
        onChange={(event) => {
          if (!quick) return;
          const name = (event.target as unknown as HTMLInputElement)
            .name as keyof QuickDraft;
          if (
            [
              "kind",
              "amount",
              "description",
              "accountId",
              "categoryId",
              "destinationAccountId",
              "occurredAt",
            ].includes(name)
          )
            manual.current[name] = true;
        }}
        noValidate
      >
        {quick && (
          <div className="quick-entry">
            <Field label="O que você quer registrar?">
              <textarea
                value={quickText}
                placeholder="Ex.: Gastei 29,3"
                maxLength={500}
                rows={2}
                onChange={(event) => {
                  setQuickText(event.target.value);
                  interpret(event.target.value);
                }}
              />
            </Field>
            <p className="field-hint" role="status">
              Revise os campos abaixo. Conta e categoria só são preenchidas
              quando identificadas pelo nome; suas escolhas manuais são
              preservadas.
            </p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!quickText.trim()}
              onClick={() => interpret(quickText, true)}
            >
              Interpretar novamente
            </Button>
          </div>
        )}
        <div className="form-type-control">
          {(
            [
              { key: "income", label: "Receita", icon: ArrowDownLeft },
              { key: "expense", label: "Despesa", icon: ArrowUpRight },
              { key: "transfer", label: "Transferir", icon: ArrowLeftRight },
            ] as const
          ).map((item) => (
            <button
              type="button"
              key={item.key}
              className={cn(kind === item.key && "active")}
              onClick={() => {
                if (quick) manual.current.kind = true;
                form.setValue("kind", item.key, { shouldValidate: quick });
                if (
                  !quick ||
                  !data.categories.some(
                    (c) =>
                      c.id === form.getValues("categoryId") &&
                      c.kind === item.key,
                  )
                )
                  form.setValue("categoryId", "", { shouldValidate: quick });
                if (!quick || item.key !== "transfer")
                  form.setValue("destinationAccountId", "", {
                    shouldValidate: quick,
                  });
              }}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </div>
        {errors.kind && <p className="field-error">{errors.kind.message}</p>}
        <Field
          label="Valor"
          error={errors.amount?.message}
          className="amount-field"
        >
          <div className="amount-input-wrap">
            <span>R$</span>
            <input
              {...form.register("amount")}
              placeholder="0,00"
              inputMode="decimal"
              autoComplete="off"
              onBlur={(e) => {
                form.register("amount").onBlur(e);
                try {
                  if (e.target.value)
                    form.setValue(
                      "amount",
                      moneyInput(parseMoney(e.target.value)),
                    );
                } catch {}
              }}
            />
          </div>
        </Field>
        <Field
          label={quick ? "Descrição (opcional)" : "Descrição"}
          error={errors.description?.message}
        >
          <input
            {...form.register("description")}
            placeholder={
              kind === "income"
                ? "Ex.: Salário de novembro"
                : kind === "expense"
                  ? "Ex.: Almoço de hoje"
                  : "Ex.: Para minha reserva"
            }
            maxLength={80}
          />
        </Field>
        <div className="form-grid">
          <Field
            label={kind === "transfer" ? "Conta de origem" : "Conta"}
            error={errors.accountId?.message}
          >
            <select {...form.register("accountId")}>
              <option value="">Selecione uma conta</option>
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          {kind === "transfer" ? (
            <Field
              label="Conta de destino"
              error={errors.destinationAccountId?.message}
            >
              <select {...form.register("destinationAccountId")}>
                <option value="">Selecione o destino</option>
                {activeAccounts
                  .filter((a) => a.id !== origin)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </Field>
          ) : (
            <Field label="Categoria" error={errors.categoryId?.message}>
              <select {...form.register("categoryId")}>
                <option value="">Selecione</option>
                {data.categories
                  .filter((c) => c.kind === kind)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </Field>
          )}
        </div>
        <Field
          label="Data e horário · São Paulo"
          error={errors.occurredAt?.message}
        >
          <input
            {...form.register("occurredAt")}
            type="datetime-local"
            max={localDateTime()}
          />
        </Field>
        <Field label="Observações (opcional)" error={errors.notes?.message}>
          <textarea
            {...form.register("notes")}
            placeholder="Algo que você queira lembrar…"
            maxLength={500}
            rows={2}
          />
        </Field>
        {kind === "transfer" && (
          <p className="field-hint">
            Transferências movimentam suas contas sem alterar receitas ou
            despesas.
          </p>
        )}
        <SaveFooter
          busy={busy}
          disabled={quick && !ready}
          error={error}
          label={
            quick
              ? "Confirmar lançamento rápido"
              : value
                ? "Salvar alterações"
                : "Confirmar movimentação"
          }
        >
          {value && (
            <DeleteAction
              resource="transactions"
              id={value.id}
              name="esta transação"
            />
          )}
        </SaveFooter>
      </form>
    </>
  );
}
const colors = [
  "#2F78FF",
  "#9B72F5",
  "#42C99A",
  "#F2AE66",
  "#E875A0",
  "#8A94AF",
];
function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="color-picker"
      role="group"
      aria-label="Cor de identificação"
    >
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          style={{ background: c }}
          className={cn(value === c && "selected")}
          onClick={() => onChange(c)}
          aria-label={`Cor ${c}`}
          aria-pressed={value === c}
        />
      ))}
    </div>
  );
}
function AccountForm({ value }: { value?: FinancialAccount }) {
  const { save, busy, error } = useSave();
  const form = useForm<
    z.input<typeof accountSchema>,
    unknown,
    z.output<typeof accountSchema>
  >({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      id: value?.id ?? crypto.randomUUID(),
      name: value?.name ?? "",
      type: value?.type ?? "checking",
      initialBalance: value ? moneyInput(value.initialBalance) : "0,00",
      icon: (value?.icon ?? "wallet") as "wallet",
      color: value?.color ?? colors[0],
      active: value?.active ?? true,
    },
  });
  const errors = form.formState.errors;
  const color = useWatch({ control: form.control, name: "color" });
  return (
    <>
      <DialogTitle className="dialog-title">
        {value ? "Editar conta" : "Um lugar para seu dinheiro"}
      </DialogTitle>
      <DialogDescription className="dialog-description">
        Conecte sua organização à vida real.
      </DialogDescription>
      <form
        className="finance-form"
        noValidate
        onSubmit={form.handleSubmit(() =>
          save("accounts", form.getValues(), value?.id),
        )}
      >
        <Field label="Nome da conta" error={errors.name?.message}>
          <input
            {...form.register("name")}
            placeholder="Ex.: Nubank, carteira, minha reserva"
            maxLength={80}
          />
        </Field>
        <div className="form-grid">
          <Field label="Tipo de conta" error={errors.type?.message}>
            <select {...form.register("type")}>
              <option value="checking">Conta corrente</option>
              <option value="cash">Dinheiro</option>
              <option value="reserve">Reserva</option>
            </select>
          </Field>
          <Field label="Ícone">
            <select {...form.register("icon")}>
              <option value="wallet">Carteira</option>
              <option value="bank">Banco</option>
              <option value="piggy">Cofrinho</option>
              <option value="banknote">Dinheiro</option>
            </select>
          </Field>
        </div>
        <Field
          label="Saldo inicial (R$)"
          error={errors.initialBalance?.message}
        >
          <input
            {...form.register("initialBalance")}
            inputMode="decimal"
            placeholder="0,00"
          />
        </Field>
        <p className="field-hint">
          Use o saldo anterior à primeira movimentação registrada.
          {value && " Alterar este valor recalcula o saldo atual da conta."}
        </p>
        <Field label="Sua cor">
          <ColorPicker
            value={color}
            onChange={(v) => form.setValue("color", v)}
          />
        </Field>
        {value && (
          <label className="checkbox-field">
            <input type="checkbox" {...form.register("active")} />
            <span>
              Conta ativa
              <small>Contas arquivadas mantêm o saldo e o histórico.</small>
            </span>
          </label>
        )}
        <SaveFooter
          busy={busy}
          error={error}
          label={value ? "Salvar conta" : "Adicionar conta"}
        />
      </form>
    </>
  );
}
function CardForm({ value }: { value?: Card }) {
  const { data, setEditor } = useFinance();
  const { save, busy, error } = useSave();
  const form = useForm<
    z.input<typeof cardSchema>,
    unknown,
    z.output<typeof cardSchema>
  >({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      name: value?.name ?? "",
      institution: value?.institution ?? "",
      type: value?.type ?? "credit",
      accountId:
        value?.accountId ?? data.accounts.find((a) => a.active)?.id ?? "",
      color: value?.color ?? colors[0],
      limit: value?.limit ? moneyInput(value.limit) : "",
      closingDay: value?.closingDay?.toString() ?? "",
      dueDay: value?.dueDay?.toString() ?? "",
    },
  });
  const errors = form.formState.errors,
    type = useWatch({ control: form.control, name: "type" }),
    color = useWatch({ control: form.control, name: "color" });
  if (!data.accounts.some((a) => a.active))
    return (
      <>
        <DialogTitle className="dialog-title">
          Seu cartão precisa de uma conta
        </DialogTitle>
        <DialogDescription className="dialog-description">
          Adicione a conta que você deseja vincular ao cartão.
        </DialogDescription>
        <Button onClick={() => setEditor({ type: "account" })}>
          Adicionar conta
        </Button>
      </>
    );
  return (
    <>
      <DialogTitle className="dialog-title">
        {value ? "Editar cartão" : "Seu cartão, organizado"}
      </DialogTitle>
      <DialogDescription className="dialog-description">
        Somente informações de organização. Sem dados sensíveis.
      </DialogDescription>
      <form
        className="finance-form"
        noValidate
        onSubmit={form.handleSubmit(() =>
          save("cards", form.getValues(), value?.id),
        )}
      >
        <Field label="Nome do cartão" error={errors.name?.message}>
          <input
            {...form.register("name")}
            placeholder="Ex.: Meu cartão principal"
          />
        </Field>
        <Field label="Instituição" error={errors.institution?.message}>
          <input {...form.register("institution")} placeholder="Ex.: Nubank" />
        </Field>
        <div className="form-grid">
          <Field label="Tipo">
            <select {...form.register("type")}>
              <option value="credit">Crédito</option>
              <option value="debit">Débito</option>
            </select>
          </Field>
          <Field label="Conta vinculada" error={errors.accountId?.message}>
            <select {...form.register("accountId")}>
              <option value="">Selecione</option>
              {data.accounts
                .filter((a) => a.active)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </Field>
        </div>
        {type === "credit" && (
          <>
            <Field label="Limite de crédito (R$)" error={errors.limit?.message}>
              <input
                {...form.register("limit")}
                inputMode="decimal"
                placeholder="0,00"
              />
            </Field>
            <div className="form-grid">
              <Field
                label="Dia de fechamento"
                error={errors.closingDay?.message}
              >
                <input
                  {...form.register("closingDay")}
                  inputMode="numeric"
                  type="number"
                  min={1}
                  max={31}
                  placeholder="Dia"
                />
              </Field>
              <Field label="Dia de vencimento" error={errors.dueDay?.message}>
                <input
                  {...form.register("dueDay")}
                  inputMode="numeric"
                  type="number"
                  min={1}
                  max={31}
                  placeholder="Dia"
                />
              </Field>
            </div>
          </>
        )}
        <Field label="Identidade visual">
          <ColorPicker
            value={color}
            onChange={(v) => form.setValue("color", v)}
          />
        </Field>
        <p className="field-hint">
          {type === "credit"
            ? "Nesta versão, o cartão é apenas um cadastro. Compras a crédito, dívida e pagamento de faturas ainda não estão disponíveis."
            : "Para registrar uma compra no débito, adicione uma despesa na conta vinculada."}
        </p>
        <SaveFooter
          busy={busy}
          error={error}
          label={value ? "Salvar alterações" : "Adicionar cartão"}
        >
          {value && (
            <DeleteAction resource="cards" id={value.id} name="este cartão" />
          )}
        </SaveFooter>
      </form>
    </>
  );
}
function CategoryForm({ value }: { value?: Category }) {
  const { save, busy, error } = useSave();
  const form = useForm<z.input<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: value?.name ?? "",
      kind: value?.kind ?? "expense",
      icon: (value?.icon ?? "tag") as "tag",
    },
  });
  const errors = form.formState.errors;
  return (
    <>
      <DialogTitle className="dialog-title">
        {value ? "Editar categoria" : "Uma nova categoria"}
      </DialogTitle>
      <DialogDescription className="dialog-description">
        Organize seus movimentos do seu jeito.
      </DialogDescription>
      <form
        className="finance-form"
        noValidate
        onSubmit={form.handleSubmit((body) =>
          save("categories", body, value?.id),
        )}
      >
        <Field label="Nome" error={errors.name?.message}>
          <input
            {...form.register("name")}
            placeholder="Ex.: Viagens"
            maxLength={80}
          />
        </Field>
        <div className="form-grid">
          <Field label="Tipo">
            <select {...form.register("kind")}>
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </select>
          </Field>
          <Field label="Ícone">
            <select {...form.register("icon")}>
              {[
                ["tag", "Etiqueta"],
                ["food", "Alimentação"],
                ["shopping", "Compras"],
                ["car", "Transporte"],
                ["home", "Moradia"],
                ["sparkles", "Lazer"],
                ["briefcase", "Trabalho"],
                ["heart", "Saúde"],
                ["book", "Educação"],
                ["banknote", "Dinheiro"],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <SaveFooter
          busy={busy}
          error={error}
          label={value ? "Salvar categoria" : "Criar categoria"}
        >
          {value && (
            <DeleteAction
              resource="categories"
              id={value.id}
              name="esta categoria"
            />
          )}
        </SaveFooter>
      </form>
    </>
  );
}
function SetupContent() {
  return (
    <>
      <div className="dialog-heading-icon">
        <Database size={25} />
      </div>
      <DialogTitle className="dialog-title">
        Vamos dar vida ao seu Fluxo.
      </DialogTitle>
      <DialogDescription className="dialog-description">
        A interface está pronta. Para guardar suas movimentações com segurança,
        conclua a configuração do servidor.
      </DialogDescription>
      <ol className="setup-steps">
        <li>
          <span>01</span>
          <div>
            Conecte seu Neon
            <small>
              Copie .env.example para .env.local e configure DATABASE_URL com a
              conexão pooled.
            </small>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            Prepare o acesso
            <small>Defina BETTER_AUTH_SECRET e BETTER_AUTH_URL.</small>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            Crie seu espaço
            <small>
              Execute npm run db:migrate e npm run user:create. Depois reinicie
              o servidor.
            </small>
          </div>
        </li>
      </ol>
      <p className="field-hint">
        O README contém o procedimento completo. Nenhum dado financeiro é salvo
        enquanto a conexão não estiver configurada.
      </p>
    </>
  );
}
function ProfileForm() {
  const { userName, setEditor } = useFinance();
  const [name, setName] = useState(userName),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <>
      <DialogTitle className="dialog-title">Seu espaço, seu nome.</DialogTitle>
      <DialogDescription className="dialog-description">
        Como você prefere ser chamado?
      </DialogDescription>
      <form
        className="finance-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (name.trim().length < 2 || name.length > 80) {
            toast.error("Use um nome com 2 a 80 caracteres.");
            return;
          }
          setBusy(true);
          try {
            const result = await authClient.updateUser({ name: name.trim() });
            if (result.error) throw new Error();
            toast.success("Perfil atualizado.");
            setEditor(null);
            router.refresh();
          } catch {
            toast.error("Não foi possível atualizar o perfil.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Seu nome">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={80}
            required
          />
        </Field>
        <ThemeSelector />
        <Button disabled={busy} type="submit">
          {busy ? "Salvando…" : "Salvar nome"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const result = await authClient.signOut();
              if (result.error) throw new Error();
              setEditor(null);
              router.replace("/login");
              router.refresh();
            } catch {
              toast.error("Não foi possível sair. Tente novamente.");
              setBusy(false);
            }
          }}
        >
          <LogOut size={16} />
          Sair da minha conta
        </Button>
      </form>
    </>
  );
}
export function FinanceForms() {
  const { editor, setEditor } = useFinance();
  return (
    <Dialog
      open={editor !== null}
      onOpenChange={(open) => {
        if (!open) setEditor(null);
      }}
    >
      <DialogContent
        key={
          editor?.type +
          (editor && "value" in editor ? (editor.value?.id ?? "new") : "")
        }
      >
        {editor?.type === "transaction" ? (
          <TransactionForm value={editor.value} initialKind={editor.kind} />
        ) : editor?.type === "quick-entry" ? (
          <QuickEntryForm />
        ) : editor?.type === "account" ? (
          <AccountForm value={editor.value} />
        ) : editor?.type === "card" ? (
          <CardForm value={editor.value} />
        ) : editor?.type === "category" ? (
          <CategoryForm value={editor.value} />
        ) : editor?.type === "profile" ? (
          <ProfileForm />
        ) : editor?.type === "setup" ? (
          <SetupContent />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
