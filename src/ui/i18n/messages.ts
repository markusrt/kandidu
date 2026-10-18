import type { LeadErrorCode } from "../../domain/lead";
import type { ProfileErrorCode } from "../../domain/profile";
import type { ProjectErrorCode } from "../../domain/project";
import type { FileErrorCode } from "../../files/errors";
import type { StoreErrorCode } from "../../storage/port";
import type { Messages } from "./de";

export type { Messages } from "./de";

export type ErrorCode =
  | StoreErrorCode
  | FileErrorCode
  | ProfileErrorCode
  | ProjectErrorCode
  | LeadErrorCode
  | "unexpected";

// Every error code has catalog text; a missing entry is a type error.
export type ErrorCatalog = Readonly<Record<ErrorCode, string>>;

export const assertErrorCatalog = (messages: Messages): ErrorCatalog =>
  messages.errors satisfies ErrorCatalog;
