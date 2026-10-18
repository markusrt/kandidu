import type { ItemErrorCode } from "../../domain/items";
import type { StoreErrorCode } from "../../storage/port";

export type ErrorCode = ItemErrorCode | StoreErrorCode | "unexpected";

// Every locale implements this shape, so a missing string is a type error.
// Parameterized text is a function: translators control word order instead of
// the UI concatenating sentence fragments.
export interface Messages {
  readonly documentTitle: string;
  readonly eyebrow: string;
  readonly heading: string;
  readonly intro: string;
  readonly listHeading: string;
  readonly listNote: string;
  readonly working: string;
  readonly loaded: string;
  readonly saved: string;
  readonly resetDone: string;
  readonly retryLoading: string;
  readonly newItemLabel: string;
  readonly addItem: string;
  readonly empty: string;
  readonly deleteItem: string;
  readonly deleteItemLabel: (title: string) => string;
  readonly resetPrompt: string;
  readonly confirmReset: string;
  readonly cancel: string;
  readonly resetData: string;
  readonly footerNote: string;
  readonly errors: Readonly<Record<ErrorCode, string>>;
}
