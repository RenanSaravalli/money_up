export const MAX_CENTS = 9_000_000_000_000n;
export function parseMoney(value: string, allowNegative = false): bigint {
  const cleaned = value
    .trim()
    .replace(/^R\$\s*/, "")
    .trim();
  const pattern = allowNegative
    ? /^-?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/
    : /^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/;
  if (!pattern.test(cleaned)) throw new Error("Use um valor como 1.250,00.");
  const negative = cleaned.startsWith("-");
  const [units, decimals = ""] = cleaned
    .replace("-", "")
    .replaceAll(".", "")
    .split(",");
  const cents =
    (BigInt(units) * 100n + BigInt(decimals.padEnd(2, "0"))) *
    (negative ? -1n : 1n);
  if (cents > MAX_CENTS || cents < -MAX_CENTS)
    throw new Error("O valor excede o limite permitido.");
  return cents;
}
export function money(value: string | bigint, symbol = true): string {
  const cents = BigInt(value),
    absolute = cents < 0n ? -cents : cents;
  return `${cents < 0n ? "−" : ""}${symbol ? "R$ " : ""}${new Intl.NumberFormat("pt-BR").format(absolute / 100n)},${String(absolute % 100n).padStart(2, "0")}`;
}
export function moneyInput(value: string | bigint): string {
  return money(value, false).replace("−", "-");
}
