import { describe, expect, it } from "vitest";
import { createBrowserStore, STORAGE_KEY } from "./browser";

function fixture(raw?: string) {
  const data = new Map<string, string>([["unrelated", "keep"]]);
  if (raw !== undefined) data.set(STORAGE_KEY, raw);
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
  return { data, storage, store: createBrowserStore(() => storage) };
}

describe("browser persistence", () => {
  it("round-trips a versioned state and resets only its own key", async () => {
    const { store, data } = fixture();
    expect(await store.load()).toEqual([]);
    const items = [{ id: "one", title: "Sample", completed: false }];
    await store.save(items);
    expect(JSON.parse(data.get(STORAGE_KEY) ?? "")).toEqual({
      version: 1,
      items,
    });
    expect(await store.load()).toEqual(items);
    await store.reset();
    expect(await store.load()).toEqual([]);
    expect(data.get("unrelated")).toBe("keep");
  });

  it.each([
    "{broken",
    "null",
    '{"version":2,"items":[]}',
    '{"version":1,"items":[{"id":"one","title":"","completed":false}]}',
    '{"version":1,"items":[{"id":"one","title":"a","completed":false},{"id":"one","title":"b","completed":true}]}',
    '{"version":1,"items":[],"unexpected":true}',
  ])("preserves invalid or incompatible data: %s", async (raw) => {
    const { store, data } = fixture(raw);
    await expect(store.load()).rejects.toMatchObject({ code: "data-invalid" });
    expect(data.get(STORAGE_KEY)).toBe(raw);
  });

  it("reports inaccessible storage on read, save, and reset", async () => {
    const store = createBrowserStore(() => {
      throw new Error("Denied");
    });
    await expect(store.load()).rejects.toMatchObject({ code: "read-failed" });
    await expect(store.save([])).rejects.toMatchObject({ code: "save-failed" });
    await expect(store.reset()).rejects.toMatchObject({ code: "reset-failed" });
  });

  it("reports quota failure without overwriting saved data", async () => {
    const { storage, data } = fixture('{"version":1,"items":[]}');
    storage.setItem = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
    const store = createBrowserStore(() => storage);
    await expect(
      store.save([{ id: "one", title: "New", completed: false }]),
    ).rejects.toMatchObject({ code: "save-failed" });
    expect(data.get(STORAGE_KEY)).toBe('{"version":1,"items":[]}');
  });

  it("validates writes before touching storage", async () => {
    const { store, data } = fixture();
    await expect(
      store.save([{ id: "", title: "Bad", completed: false }]),
    ).rejects.toThrow();
    expect(data.has(STORAGE_KEY)).toBe(false);
  });
});
