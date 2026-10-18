export interface DemoItem {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
}

export const TITLE_MAX = 120;

export type ItemErrorCode = "title-invalid" | "id-invalid";

// Domain rules report codes, not user-facing text; the UI localizes them.
export class ItemError extends Error {
  readonly code: ItemErrorCode;

  constructor(code: ItemErrorCode) {
    super(code);
    this.name = "ItemError";
    this.code = code;
  }
}

export function createItem(
  items: readonly DemoItem[],
  title: string,
  id: string,
): DemoItem[] {
  const trimmed = title.trim();
  if (!trimmed || trimmed.length > TITLE_MAX) {
    throw new ItemError("title-invalid");
  }
  if (!id.trim() || items.some((item) => item.id === id)) {
    throw new ItemError("id-invalid");
  }
  return [...items, { id, title: trimmed, completed: false }];
}

export function toggleItem(items: readonly DemoItem[], id: string): DemoItem[] {
  return items.map((item) =>
    item.id === id ? { ...item, completed: !item.completed } : item,
  );
}

export function deleteItem(items: readonly DemoItem[], id: string): DemoItem[] {
  return items.filter((item) => item.id !== id);
}
