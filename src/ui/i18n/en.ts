import { TITLE_MAX } from "../../domain/items";
import type { Messages } from "./messages";

const titleMax = new Intl.NumberFormat("en").format(TITLE_MAX);

export const en: Messages = {
  documentTitle: "Local-first MVP starter demo",
  eyebrow: "Reusable starter · demo only",
  heading: "A small idea, saved locally.",
  intro:
    "Create, check, and delete sample items to try the harness. This is not your product yet.",
  listHeading: "Demo items",
  listNote:
    "Discardable sample data only. No account, server, or backup. Use this browser and origin to return to your items.",
  working: "Working…",
  loaded: "Demo loaded from this browser.",
  saved: "Saved in this browser.",
  resetDone: "Demo data reset. Other site storage was not changed.",
  retryLoading: "Retry loading",
  newItemLabel: "New demo item",
  addItem: "Add item",
  empty: "No demo items yet. Add one above to begin.",
  deleteItem: "Delete",
  deleteItemLabel: (title) => `Delete ${title}`,
  resetPrompt:
    "Delete all demo items from this browser? This cannot be undone.",
  confirmReset: "Confirm reset demo",
  cancel: "Cancel",
  resetData: "Reset demo data",
  footerNote:
    "Local persistence does not guarantee offline page loading. Review the project docs before building your own idea.",
  errors: {
    "title-invalid": `Enter a title between 1 and ${titleMax} characters.`,
    "id-invalid": "Item IDs must be non-empty and unique.",
    "read-failed":
      "Cannot read browser storage. Allow site storage and retry. No data was changed.",
    "data-invalid":
      "Demo data is malformed or from an unsupported version. It has been preserved. Retry or deliberately reset the demo.",
    "save-failed":
      "Not saved: browser storage is unavailable or full. Your last saved data is unchanged. Allow storage or free space, then try again.",
    "reset-failed": "Reset failed: browser storage is unavailable. Try again.",
    unexpected: "Unexpected failure. Please retry.",
  },
};
