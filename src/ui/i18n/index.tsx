import { createContext, type ReactNode, useContext } from "react";
import { LeadError } from "../../domain/lead";
import type { LetterFormatter } from "../../domain/letterData";
import { ProfileError } from "../../domain/profile";
import { ProjectError } from "../../domain/project";
import { TagError } from "../../domain/tags";
import { FileError } from "../../files/errors";
import { StoreError } from "../../storage/port";
import { de } from "./de";
import { assertErrorCatalog, type ErrorCode, type Messages } from "./messages";

export type { Messages } from "./messages";

// Add a locale by adding its catalog here; the spec language is the default.
export const catalogs = { de } satisfies Record<string, Messages>;
export type Locale = keyof typeof catalogs;
export const defaultLocale: Locale = "de";

const MessagesContext = createContext<Messages>(catalogs[defaultLocale]);

export function MessagesProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <MessagesContext.Provider value={catalogs[locale]}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages(): Messages {
  return useContext(MessagesContext);
}

export function errorCode(cause: unknown): ErrorCode {
  if (
    cause instanceof StoreError ||
    cause instanceof FileError ||
    cause instanceof ProfileError ||
    cause instanceof ProjectError ||
    cause instanceof LeadError ||
    cause instanceof TagError
  ) {
    return cause.code;
  }
  return "unexpected";
}

/** Localized text for any thrown value; never raw technical messages. */
export function errorMessage(cause: unknown, messages: Messages): string {
  return assertErrorCatalog(messages)[errorCode(cause)];
}

/** Letter wording for the domain's letter data builder. */
export function letterFormatter(messages: Messages): LetterFormatter {
  return {
    longDate: messages.format.date,
    shortDate: messages.format.shortDate,
    salutation: (kind, contact) => {
      const title = contact?.title?.trim() ?? "";
      const lastName = contact?.lastName?.trim() ?? "";
      if (kind === "female") return messages.letter.female(title, lastName);
      if (kind === "male") return messages.letter.male(title, lastName);
      return messages.letter.neutral;
    },
    contactName: (contact) =>
      [
        contact?.salutation,
        contact?.title,
        contact?.firstName,
        contact?.lastName,
      ]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(" "),
  };
}
