import { useEffect, useState } from "react";
import { useMessages } from "./i18n";
import { type StorageLevel, storageLevel } from "./quota";
import { Link } from "./router";
import { useApp } from "./state";

/** The browser-reported storage level, refreshed after every saved change. */
export function useStorageLevel(): StorageLevel | undefined {
  const { store, state } = useApp();
  const [level, setLevel] = useState<StorageLevel>();
  const snapshot = state.kind === "ready" ? state.snapshot : undefined;
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-read per snapshot
  useEffect(() => {
    let active = true;
    void store.storageEstimate().then((estimate) => {
      if (active) setLevel(storageLevel(estimate));
    });
    return () => {
      active = false;
    };
  }, [store, snapshot]);
  return level;
}

/** Shown before uploads once 80 % of the quota are used (FR-042). */
export function StorageWarning() {
  const m = useMessages();
  const level = useStorageLevel();
  if (!level?.warn) return null;
  return (
    <p className="warning">
      {m.data.uploadWarning(m.format.percent(level.ratio))}{" "}
      <Link to={{ name: "data" }}>{m.data.toData}</Link>
    </p>
  );
}
