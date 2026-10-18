import { describe, expect, it } from "vitest";
import {
  createItem,
  deleteItem,
  ItemError,
  TITLE_MAX,
  toggleItem,
} from "./items";

function errorCode(action: () => unknown): string | undefined {
  try {
    action();
  } catch (cause) {
    return cause instanceof ItemError ? cause.code : "not-an-item-error";
  }
  return undefined;
}

describe("demo domain", () => {
  it("creates, checks, and deletes without mutating inputs", () => {
    const initial = createItem([], "  Try the demo  ", "one");
    expect(initial).toEqual([
      { id: "one", title: "Try the demo", completed: false },
    ]);
    const checked = toggleItem(initial, "one");
    expect(checked[0]?.completed).toBe(true);
    expect(initial[0]?.completed).toBe(false);
    expect(toggleItem(checked, "one")).toEqual(initial);
    expect(deleteItem(checked, "one")).toEqual([]);
    expect(deleteItem(initial, "missing")).toEqual(initial);
  });

  it("rejects invalid titles and IDs with localizable codes", () => {
    for (const title of ["", "   ", "a".repeat(TITLE_MAX + 1)]) {
      expect(errorCode(() => createItem([], title, "one"))).toBe(
        "title-invalid",
      );
    }
    expect(errorCode(() => createItem([], "Valid", ""))).toBe("id-invalid");
    const items = createItem([], "Valid", "one");
    expect(errorCode(() => createItem(items, "Duplicate", "one"))).toBe(
      "id-invalid",
    );
    expect(createItem([], "a".repeat(TITLE_MAX), "one")).toHaveLength(1);
  });
});
