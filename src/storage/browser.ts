import { z } from "zod";
import { TITLE_MAX } from "../domain/items";
import { type DemoStore, StoreError } from "./port";

export const STORAGE_KEY = "mvp-starter:demo:v1";

const stateSchema = z
  .object({
    version: z.literal(1),
    items: z
      .array(
        z
          .object({
            id: z.string().trim().min(1),
            title: z.string().trim().min(1).max(TITLE_MAX),
            completed: z.boolean(),
          })
          .strict(),
      )
      .refine(
        (items) => new Set(items.map((item) => item.id)).size === items.length,
      ),
  })
  .strict();

type StorageAccess = () => Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createBrowserStore(
  access: StorageAccess = () => window.localStorage,
): DemoStore {
  return {
    async load() {
      let raw: string | null;
      try {
        raw = access().getItem(STORAGE_KEY);
      } catch {
        throw new StoreError("read-failed");
      }
      if (raw === null) return [];
      try {
        return stateSchema.parse(JSON.parse(raw)).items;
      } catch {
        throw new StoreError("data-invalid");
      }
    },
    async save(items) {
      const state = stateSchema.parse({ version: 1, items });
      try {
        access().setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        throw new StoreError("save-failed");
      }
    },
    async reset() {
      try {
        access().removeItem(STORAGE_KEY);
      } catch {
        throw new StoreError("reset-failed");
      }
    },
  };
}
