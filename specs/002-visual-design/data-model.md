# Data model: 002-visual-design

No persisted data, schema, backup format or domain type changes (FR-007,
SC-002). Data from earlier versions loads unchanged because `src/domain` and
`src/storage` are not modified.

The only new model is the design token set (UI only), described in
[contracts/design-tokens.md](contracts/design-tokens.md).
