import { describe, expect, it } from "vitest";
import { createItem, ItemError } from "../../domain/items";
import { StoreError } from "../../storage/port";
import { catalogs, errorMessage } from "./index";

describe("message catalogs", () => {
  it("maps domain and storage error codes to catalog text", () => {
    const { en } = catalogs;
    let domainFailure: unknown;
    try {
      createItem([], " ", "one");
    } catch (cause) {
      domainFailure = cause;
    }
    expect(domainFailure).toBeInstanceOf(ItemError);
    expect(errorMessage(domainFailure, en)).toBe(en.errors["title-invalid"]);
    expect(errorMessage(new StoreError("save-failed"), en)).toBe(
      en.errors["save-failed"],
    );
  });

  it("never shows raw technical messages to users", () => {
    const { en } = catalogs;
    expect(errorMessage(new Error("ZodError: internal"), en)).toBe(
      en.errors.unexpected,
    );
    expect(errorMessage("thrown string", en)).toBe(en.errors.unexpected);
  });

  it("has non-empty text in every catalog", () => {
    for (const messages of Object.values(catalogs)) {
      for (const text of [
        ...Object.values(messages).filter((v) => typeof v === "string"),
        ...Object.values(messages.errors),
        messages.deleteItemLabel("x"),
      ]) {
        expect(text.trim()).not.toBe("");
      }
    }
  });
});
