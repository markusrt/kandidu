# Contract: Backup ZIP (FR-043, US5, C2)

File name: `JJJJ-MM-TT_Kandidu_Sicherung.zip`.

```text
kandidu-backup.json
files/<fileId>          (raw bytes, no extension)
LIESMICH.txt            (German note: contains personal data, keep safe)
```

`kandidu-backup.json`:

```jsonc
{
  "format": "kandidu-backup",
  "formatVersion": 1,
  "schemaVersion": 1,
  "exportedAt": "2026-10-18T12:00:00.000Z",
  "data": { "profile": …, "templates": […], "documents": […], "projects": […], "leads": […] },
  "files": [{ "id": "…", "size": 12345, "sha256": "hex…" }]
}
```

Import rules:

1. Unzip; require `kandidu-backup.json`; validate with the same Zod schemas as
   storage; `formatVersion`/`schemaVersion` newer than supported →
   `unsupported-version`.
2. Every `fileId` referenced by data must be listed in `files` and present in the
   ZIP with matching size and SHA-256 (Web Crypto). Extra files are ignored.
3. Only when 1–2 pass, and after explicit user confirmation if data exists, the
   adapter replaces all stores in a single transaction. Any failure leaves the
   current data untouched.
