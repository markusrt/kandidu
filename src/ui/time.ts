// Clock helpers for the UI layer; the domain receives these values as input.

export function nowIso(): string {
  return new Date().toISOString();
}

/** Today's local calendar date as `YYYY-MM-DD`. */
export function todayIso(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function newId(): string {
  return crypto.randomUUID();
}
