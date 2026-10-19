import type { StorageEstimate } from "../storage/port";

// Storage usage against the browser-reported quota (FR-042).

/** From this share of the quota on, uploads are preceded by a warning. */
export const QUOTA_WARNING_RATIO = 0.8;

export interface StorageLevel {
  readonly usage: number;
  readonly quota: number;
  /** Used share of the quota, clamped to 0–1. */
  readonly ratio: number;
  readonly warn: boolean;
}

/** Undefined when the browser reports nothing usable. */
export function storageLevel(
  estimate: StorageEstimate | undefined,
): StorageLevel | undefined {
  if (!estimate) return undefined;
  const { usage, quota } = estimate;
  if (!Number.isFinite(usage) || !Number.isFinite(quota) || quota <= 0) {
    return undefined;
  }
  const ratio = Math.min(Math.max(usage / quota, 0), 1);
  return { usage, quota, ratio, warn: ratio >= QUOTA_WARNING_RATIO };
}
