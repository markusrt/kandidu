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
      to: { path: "^src/storage/browser" },
    },
  ],
  options: {
    tsConfig: { fileName: "tsconfig.app.json" },
    doNotFollow: { path: "node_modules" },
    enhancedResolveOptions: { extensions: [".ts", ".tsx", ".js", ".json"] },
  },
};
