import { useId } from "react";
import { StorageWarning } from "./StorageWarning";

/** Labeled file picker; resets after each pick so the same file can be chosen again. */
export function FileField({
  label,
  hint,
  accept,
  disabled,
  storageWarning = true,
  onFile,
}: {
  label: string;
  hint: string;
  accept: string;
  disabled?: boolean;
  /** Warn before the upload when storage is almost full (FR-042). */
  storageWarning?: boolean;
  onFile: (file: File) => void;
}) {
  const id = useId();
  return (
    <div className="field file-field">
      {storageWarning && <StorageWarning />}
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        aria-describedby={`${id}-hint`}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) onFile(file);
        }}
      />
      <p id={`${id}-hint`} className="hint">
        {hint}
      </p>
    </div>
  );
}
