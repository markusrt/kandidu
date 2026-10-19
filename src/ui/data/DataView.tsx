import { useEffect, useState } from "react";
import type { PersistenceResult } from "../../storage/port";
import { useMessages } from "../i18n";
import { useStorageLevel } from "../StorageWarning";
import { useApp } from "../state";

// `#/daten`: where the data lives, storage usage and persistence (FR-042,
// FR-045), and the confirmed reset (contracts/ui-routes.md).

export function DataPage() {
  const m = useMessages();
  const { store, reset, busy, announce } = useApp();
  const level = useStorageLevel();
  const [persistence, setPersistence] = useState<PersistenceResult>();
  const [requested, setRequested] = useState<PersistenceResult>();
  const [requesting, setRequesting] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    let active = true;
    void store.persistenceState().then((state) => {
      if (active) setPersistence(state);
    });
    return () => {
      active = false;
    };
  }, [store]);

  async function requestPersistence() {
    setRequesting(true);
    const result = await store.requestPersistence();
    setRequesting(false);
    setRequested(result);
    if (result === "granted") {
      setPersistence("granted");
      announce(m.data.persistenceGrantedNow);
    }
  }

  return (
    <>
      <h1>{m.data.heading}</h1>
      <section className="card" aria-labelledby="data-local">
        <h2 id="data-local">{m.data.localHeading}</h2>
        <p className="info">{m.data.localText}</p>
      </section>

      <section className="card" aria-labelledby="data-usage">
        <h2 id="data-usage">{m.data.usageHeading}</h2>
        {level ? (
          <>
            <p>
              {m.data.usage(
                m.format.bytes(level.usage),
                m.format.bytes(level.quota),
                m.format.percent(level.ratio),
              )}
            </p>
            {level.warn && <p className="warning">{m.data.usageWarning}</p>}
          </>
        ) : (
          <p>{m.data.usageUnknown}</p>
        )}
      </section>

      <section className="card" aria-labelledby="data-persistence">
        <h2 id="data-persistence">{m.data.persistenceHeading}</h2>
        {persistence === "granted" && <p>{m.data.persistenceGranted}</p>}
        {persistence === "unsupported" && (
          <p className="warning">{m.data.persistenceUnsupported}</p>
        )}
        {persistence === "denied" && (
          <>
            <p>{m.data.persistenceDenied}</p>
            <p className="hint">{m.data.persistenceExplain}</p>
            <div className="actions">
              <button
                type="button"
                disabled={requesting}
                onClick={() => void requestPersistence()}
              >
                {m.data.persistenceRequest}
              </button>
            </div>
            {requested && requested !== "granted" && (
              <p className="warning" role="alert">
                {m.data.persistenceDeniedNow}
              </p>
            )}
          </>
        )}
      </section>

      <section className="card" aria-labelledby="data-reset">
        <h2 id="data-reset">{m.data.resetHeading}</h2>
        <p>{m.data.resetIntro}</p>
        {confirmingReset ? (
          <fieldset className="confirm">
            <legend>{m.recovery.resetStart}</legend>
            <p>{m.recovery.resetPrompt}</p>
            <div className="actions">
              <button
                type="button"
                className="danger"
                disabled={busy}
                onClick={() => {
                  setConfirmingReset(false);
                  void reset();
                }}
              >
                {m.recovery.resetConfirm}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setConfirmingReset(false)}
              >
                {m.common.cancel}
              </button>
            </div>
          </fieldset>
        ) : (
          <div className="actions">
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => setConfirmingReset(true)}
            >
              {m.recovery.resetStart}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
