export const TIME_ZONE = "America/Sao_Paulo";
export function localDate(date: Date | string = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(date));
  return ["year", "month", "day"]
    .map((p) => parts.find((x) => x.type === p)!.value)
    .join("-");
}
export function localDateTime(date: Date | string = new Date()) {
  return `${localDate(date)}T${new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(date))}`;
}
export function toInstant(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Data inválida.");
  const wall = new Date(`${value}:00Z`);
  if (!Number.isFinite(wall.getTime())) throw new Error("Data inválida.");
  let guess = wall.getTime();
  for (let i = 0; i < 3; i++) {
    const offset = new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      timeZoneName: "longOffset",
    })
      .formatToParts(new Date(guess))
      .find((p) => p.type === "timeZoneName")!.value;
    const match = offset.match(/GMT([+-])(\d{2}):(\d{2})/);
    const offsetMs = match
      ? (Number(match[2]) * 60 + Number(match[3])) *
        60_000 *
        (match[1] === "+" ? 1 : -1)
      : 0;
    guess = wall.getTime() - offsetMs;
  }
  if (localDateTime(new Date(guess)) !== value)
    throw new Error("Data ou horário inexistente.");
  return new Date(guess).toISOString();
}
export function dateLabel(value: string, withTime = false) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}
export function shiftDay(key: string, days: number) {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
