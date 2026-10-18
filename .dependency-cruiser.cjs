module.exports = {
  forbidden: [
    { name: "no-cycles", severity: "error", from: {}, to: { circular: true } },
    {
      name: "pure-domain",
      severity: "error",
      from: { path: "^src/domain", pathNot: "\\.test\\.ts$" },
      to: { pathNot: "^src/domain" },
    },
    {
      name: "storage-does-not-import-ui",
      severity: "error",
      from: { path: "^src/storage" },
      to: { path: "^src/(ui|main)" },
    },
    {
      name: "ui-uses-storage-port",
      severity: "error",
      from: { path: "^src/ui" },
      to: { path: "^src/storage/(indexeddb|backup)" },
    },
    // ADR 009: format adapters and LLM parsing are boundaries below the UI.
    {
      name: "files-and-llm-are-boundaries",
      severity: "error",
      from: { path: "^src/(files|llm)" },
      to: { path: "^src/(ui|storage|main)" },
    },
    {
      name: "storage-uses-only-zip-from-files",
      severity: "error",
      from: { path: "^src/storage" },
      to: { path: "^src/files", pathNot: "^src/files/(zip|errors)\\.ts$" },
    },
  ],
  options: {
    tsConfig: { fileName: "tsconfig.app.json" },
    doNotFollow: { path: "node_modules" },
    enhancedResolveOptions: { extensions: [".ts", ".tsx", ".js", ".json"] },
  },
};
