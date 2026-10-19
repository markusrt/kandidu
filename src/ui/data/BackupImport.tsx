import { useState } from "react";
import { FileField } from "../FileField";
import { errorCode, errorMessage, useMessages } from "../i18n";
import { useApp } from "../state";

/**
 * Picks a backup ZIP and replaces all data with it (FR-043). With existing
 * data it asks first; an invalid backup changes nothing.
 */
export function BackupImport({ hasData }: { hasData: boolean }) {
  const m = useMessages();
  const { restore, busy } = useApp();
  const [pending, setPending] = useState<{ name: string; bytes: Uint8Array }>();
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  async function run(bytes: Uint8Array) {
    setPending(undefined);
    setError("");
    setWorking(true);
    try {
      await restore(bytes);
    } catch (cause) {
      setError(
        errorCode(cause) === "unsupported-version"
          ? m.backup.newerVersion
          : errorMessage(cause, m),
      );
    } finally {
      setWorking(false);
    }
  }

  async function pick(file: File) {
    setError("");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (hasData) setPending({ name: file.name, bytes });
    else await run(bytes);
  }

  return (
    <>
      <FileField
        label={m.backup.importLabel}
        hint={working ? m.backup.importing : m.backup.importHint}
        accept=".zip,application/zip"
        disabled={busy || working}
        onFile={(file) => void pick(file)}
      />
      {pending && (
        <fieldset className="confirm">
          <legend>{m.backup.importHeading}</legend>
          <p>{m.backup.replacePrompt(pending.name)}</p>
          <div className="actions">
            <button
              type="button"
              className="danger"
              disabled={busy || working}
              onClick={() => void run(pending.bytes)}
            >
              {m.backup.replaceConfirm}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setPending(undefined)}
            >
              {m.common.cancel}
            </button>
          </div>
        </fieldset>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
