import type { DemoItem } from "../domain/items";

export interface DemoStore {
  load(): Promise<DemoItem[]>;
  save(items: readonly DemoItem[]): Promise<void>;
  reset(): Promise<void>;
}

export type StoreErrorCode =
  | "read-failed"
  | "data-invalid"
  | "save-failed"
  | "reset-failed";

// Adapters report codes, not user-facing text; the UI localizes them.
export class StoreError extends Error {
  readonly code: StoreErrorCode;

  constructor(code: StoreErrorCode) {
    super(code);
    this.name = "StoreError";
    this.code = code;
  }
}
