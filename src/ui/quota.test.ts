import { describe, expect, it } from "vitest";
import { storageLevel } from "./quota";

describe("storageLevel (FR-042)", () => {
  it("warns from 80 % of the quota on", () => {
    expect(storageLevel({ usage: 79, quota: 100 })).toEqual({
      usage: 79,
      quota: 100,
      ratio: 0.79,
      warn: false,
    });
    expect(storageLevel({ usage: 80, quota: 100 })?.warn).toBe(true);
    expect(storageLevel({ usage: 99, quota: 100 })?.warn).toBe(true);
  });

  it("clamps the ratio", () => {
    expect(storageLevel({ usage: 150, quota: 100 })?.ratio).toBe(1);
    expect(storageLevel({ usage: -5, quota: 100 })?.ratio).toBe(0);
  });

  it("ignores missing or unusable estimates", () => {
    expect(storageLevel(undefined)).toBeUndefined();
    expect(storageLevel({ usage: 0, quota: 0 })).toBeUndefined();
    expect(storageLevel({ usage: 1, quota: Number.NaN })).toBeUndefined();
    expect(
      storageLevel({ usage: Number.POSITIVE_INFINITY, quota: 100 }),
    ).toBeUndefined();
  });
});
