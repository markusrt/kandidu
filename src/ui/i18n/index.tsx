import { createContext, type ReactNode, useContext } from "react";
import { ItemError } from "../../domain/items";
import { StoreError } from "../../storage/port";
import { en } from "./en";
import type { Messages } from "./messages";

export type { Messages } from "./messages";

// Add a locale by adding its catalog here; the spec language is the default.
export const catalogs = { en } satisfies Record<string, Messages>;
export type Locale = keyof typeof catalogs;
export const defaultLocale: Locale = "en";

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

export function errorMessage(cause: unknown, messages: Messages): string {
  if (cause instanceof ItemError || cause instanceof StoreError) {
    return messages.errors[cause.code];
  }
  return messages.errors.unexpected;
}
