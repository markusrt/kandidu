// Clock helpers for the UI layer; the domain receives these values as input.

export function nowIso(): string {
  return new Date().toISOString();
}

/** Today's local calendar date as `YYYY-MM-DD`. */
export function todayIso(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The local date and time as `YYYY-MM-DDTHH:mm`, like `datetime-local`. */
export function localNow(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${todayIso(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function newId(): string {
  return crypto.randomUUID();
}
