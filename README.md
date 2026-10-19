# Kandidu

Kandidu is a local-first browser app that guides one person through job
applications. All data stays in the browser. See the
[feature spec](specs/001-bewerbungs-mvp/spec.md) for requirements and
[docs/STATUS.md](docs/STATUS.md) for current progress and pending reviews.

## Using Kandidu: data, resume, limits

- The public build of `main` runs at <https://markusrt.github.io/kandidu/>.
  It is a static page; no data leaves the browser and nothing is sent to a
  server. The LLM step is copy and paste by the person.
- Data (profile, templates, PDFs, projects, leads) lives in IndexedDB of the
  browser profile and origin that was used. Reopening the same browser
  resumes where you left off. Another browser, device, or a local server on a
  different port starts empty.
- The only safeguard is the backup: "Daten" → "Sicherung herunterladen"
  (a ZIP with personal data, unencrypted) and "Sicherung importieren".
  Clearing browser data deletes everything; ask for persistent storage on
  "Daten".
- Stored data and backups from older versions are upgraded automatically on
  first open; there is no downgrade.
- Known limits: automated tests cover Chromium only; Word/LibreOffice
  round trips and the 15-minute first-run goal (SC-001) are checked by a
  person; LLM research (original posting, address, sources) is not verified
  by the app; dates inside uploaded PDFs are fixed. Details and the current
  list: [docs/STATUS.md](docs/STATUS.md) "Limits and known gaps".

## Make an independent project

- [ ] `markusrt/mvp-starter` is marked as a template repository (checked
  2026-10-18), so **Use this template** creates new repositories from `main`.
  Changes reach new projects only after they are merged to `main`.
- [ ] Create a repository from the enabled template, or make an ordinary source
  copy into a new independent repository. Copying files does not require a
  generator, account service, or preserved upstream Git history; do not delete or
  rewrite an existing worktree/history to initialize a project.
- [ ] Customize the package name, page title, UI copy, canonical docs, and an
  application-owned storage key. Update adapter/tests/docs consistently; do not
  run global string replacement or delete unrelated origin storage.
- [ ] Review ownership, permissions, data needs, and licensing before publishing.
  No license grant is invented by these instructions; select one only with
  authority to do so.
- [ ] Install Spec Kit once per machine (needs Python and
  [uv](https://docs.astral.sh/uv/)): `uv tool install specify-cli`. Evaluated with
  1.2.1; check with `specify --version`.
- [ ] In the new repository, run
  `specify init --here --integration <agent>` (for example `claude`, `codex`,
  `copilot`, `cursor-agent`; `specify integration list` shows all). It adds the
  agent's `speckit-*` commands and `.specify/` scripts/templates, and keeps the
  shipped constitution and tasks-template override. Commit the result so any
  later agent can resume. Don't install the git-branching extension unless
  branch creation is authorized.
- [ ] Paste the [bootstrap prompt](BOOTSTRAP-PROMPT.md) with your idea. The
  agent runs specify → clarify → plan → tasks → analyze → implement and stops
  at the C1 gate with a running app. Reassess assignment permissions:
  source-repository authorization is not copied.

## First run and local development

Prerequisites: Node **24.21.0** pinned in `.node-version`, `.nvmrc`, and
`engines`; pnpm **10.34.7** pinned in `packageManager`.

Install that Node version (for example, `nvm install && nvm use` with nvm),
then install pnpm with `npm install --global pnpm@10.34.7`. From the project root:

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium
pnpm dev --host 127.0.0.1
```

Use the actual URL printed by the running server; verify it responds. A
`127.0.0.1` URL works only on the machine running the server. A remote environment
needs an explicitly configured port-forwarded URL and suitable access controls;
no forwarded/public URL is implied or provided here. Browser/system dependency
installation may require environment permissions.

```sh
pnpm test         # fast unit checks
pnpm test:watch   # interactive unit loop
pnpm lint:fix     # modifies files; review the diff
pnpm verify      # lint → typecheck → architecture → test → build → test:e2e
```

These commands are not recorded execution evidence. See `docs/STATUS.md` for actual
results and limitations, including unavailable tooling or browser checks in
`docs/STATUS.md`. `pnpm test:e2e` expects a built app (`pnpm build` first);
Playwright starts and waits for its own production-preview server on port 4173.
Unit and browser runners fail when no tests are found.

To restart after a session ends, run `pnpm dev --host 127.0.0.1 --port 5173 --strictPort`.
Only if your environment offers authenticated forwarding, bind with
`pnpm dev --host 0.0.0.0 --port 5173 --strictPort` and forward port 5173;
check access controls and verify the actual forwarded URL before sharing it.
No server or preview is guaranteed to survive an agent session. Production
deployment happens only through the ship flow below.

## Architecture and storage

- `src/domain`: pure TypeScript; no external, UI, or storage imports.
- `src/storage`: asynchronous `DemoStore`, Zod boundary validation, localStorage
  adapter.
- `src/ui`: React presentation; `src/ui/i18n`: typed message catalogs (`en`
  default), error-code mapping; `src/main.tsx`: composition root and locale.
  Domain and storage throw typed error codes, never user-facing text.

The demo owns `mvp-starter:demo:v1` and stores version 1
`{version:1,items:[{id,title,completed}]}`. Stable unique IDs, nonempty trimmed
titles of at most 120 characters, and boolean completion are validated.
Corrupt/unsupported data and read failures block writes until successful retry
or a deliberate confirmed own-key reset. Writes are shown as saved only on
success. No migration is implemented; future transforms must be explicit/tested.

This is discardable, nonsensitive demo storage: no durable-record guarantee,
backup/export, cloud sync, or guaranteed offline application loading. Revisit
storage before real product use. [ADR 002](docs/adr/002-storage.md) explains
IndexedDB/cloud decision criteria and recovery limits.

## Work with any agent

Read [the constitution](.specify/memory/constitution.md) → [AGENTS.md](AGENTS.md) →
`docs/STATUS.md` → the active `specs/NNN-*/` feature → relevant [ADRs](docs/adr/).
Copy [BOOTSTRAP-PROMPT.md](BOOTSTRAP-PROMPT.md), provide an idea and optional
language/devices/design/sensitivity/budget/permissions, and work through C1 risky
core, C2 useful reload/recovery, and C3 agreed acceptance/handoff.

| You | Agent |
| --- | --- |
| `specify init`, paste the prompt | `/speckit-specify` → `/speckit-clarify` (≤5 blocking questions) |
| Answer blocking questions | `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement` |
| Review the running app at C1/C2/C3, decide | Fold feedback into the spec, refresh tasks, continue to the next gate |
| Approve a gate | Ship per mode: PR for expert review, or auto-merge → GitHub Pages → live URL |

Models: run the main session on Opus (`claude --model opus`) for specifying,
planning, and judgment-heavy tasks. Tasks the planner tags `[ROUTINE]` are
delegated to the `speckit-implementer` subagent on Sonnet
(`.claude/agents/speckit-implementer.md`), and the main session reviews them
([ADR 006](docs/adr/006-model-routing.md)).

Write the brief in whatever language suits you: the agent talks to you and
writes the spec in that language, and builds the UI in it as the default locale
behind a message catalog. Headings, markers, and IDs inside specs stay English so
Spec Kit commands keep working; all technical docs and code are English
([ADR 005](docs/adr/005-language-policy.md)).

Later features choose a delivery mode in `/speckit-plan` (constitution,
[ADR 010](docs/adr/010-delivery-modes.md)): **Full** stops at C1, C2, and C3;
**Light** (a small extension of a proven workflow) stops once at C3; **Spike**
(an open question) stops once at C1 with a go/no-go result. The first feature
is always Full.

The checkpoints are enforced by GATE tasks from
`.specify/templates/overrides/tasks-template.md`, which `/speckit-tasks` uses
instead of Spec Kit's core template. No agent-specific memory is required;
acceptance and external actions remain explicit human gates. Rationale:
[ADR 004](docs/adr/004-spec-kit.md).

## Prompt templates for later features

Use these for features after the MVP (001-bewerbungs-mvp). Start a fresh
session for each (`claude --model opus`); the repository is the handoff. The
templates are German because the spec language is `de-DE` and the agent talks
in the language of the prompt. Replace the bracketed parts.

### Implement a backlog item (for example R5 or R6)

```text
Lies .specify/memory/constitution.md, AGENTS.md („Owner working rules“),
docs/STATUS.md (Kopf und „Exact next action“) und aus
specs/001-bewerbungs-mvp/spec.md nur den Backlog-Eintrag [ID]. Weitere
Abschnitte aus Spec, Plan oder Code nur lesen, wenn ein Schritt sie braucht.

EINTRAG: [Backlog-ID und Titel, z. B. R5 „Anschreiben-Vorlage je Projekt“]
HINWEISE (optional): [was ich schon weiß, will oder ausschließe]

1. Worktree und STATUS prüfen. main aktualisieren (git pull --ff-only); lokale
   Commits auf main, die noch nicht auf origin sind, gehen mit dem nächsten PR
   mit. Von main einen Branch anlegen, benannt nach dem neuen Spec-Kit-Feature.
2. /speckit-specify für diesen Eintrag als neues Feature (Backlog-ID
   verlinken), dann /speckit-clarify mit höchstens fünf blockierenden Fragen,
   jede mit empfohlener Antwort.
3. /speckit-plan. Wähle den Delivery Mode (Full, Light, Spike; Konstitution
   „Delivery modes“), trage ihn mit Begründung in plan.md und STATUS ein und
   nenne ihn mir in einem Satz.
4. /speckit-tasks, /speckit-analyze, Befunde beheben, Planung committen.
5. /speckit-implement Story für Story (ein Commit pro Story) bis zum nächsten
   GATE, Übergabe durchführen, dann stopp.
Wenn der Kontext über etwa 250k Tokens wächst: an der nächsten Story-Grenze mit
einer „in progress“-Übergabe in STATUS anhalten und mir Bescheid geben.
Sprich Deutsch mit mir.
```

### Plan and implement a new feature from a free-text brief

Examples: deployment with a real database, comments in Markdown with links.

```text
Lies .specify/memory/constitution.md, AGENTS.md („Owner working rules“),
docs/STATUS.md (Kopf und „Exact next action“) und die ADRs, die der Auftrag
berührt (z. B. 001 Stack, 002/008 Speicher, 007 Ship-Ablauf). Frühere Specs nur
gezielt nach dem durchsuchen, was dieses Feature ändert, nicht vollständig lesen.

AUFTRAG: [was möglich sein soll, für wen und warum]
RAHMEN (optional): [Budget, Datenschutz, Geräte, Termin, Dienste]

1. Worktree und STATUS prüfen. main aktualisieren (git pull --ff-only); lokale
   Commits auf main, die noch nicht auf origin sind, gehen mit dem nächsten PR
   mit. Von main einen Branch anlegen, benannt nach dem neuen Spec-Kit-Feature.
2. /speckit-specify mit dem Auftrag als neues Feature; Unklares als
   [NEEDS CLARIFICATION] markieren. /speckit-clarify: höchstens fünf
   blockierende Fragen, jede mit empfohlener Antwort; auf Antworten warten, die
   Abnahme, Fachlogik, Datenschutz, Aufbewahrung, Kosten, externen Zugriff oder
   Architektur ändern.
3. /speckit-plan. Wähle den Delivery Mode (Full, Light, Spike), trage ihn mit
   Begründung in plan.md und STATUS ein und nenne ihn mir in einem Satz. Weicht
   der Plan von einer festgehaltenen Entscheidung ab (z. B. Backend oder
   Datenbank, Daten verlassen den Browser, Konten, kostenpflichtiger Dienst):
   ADR-Entwurf schreiben und vor /speckit-tasks auf meine Freigabe warten.
4. /speckit-tasks, /speckit-analyze, Befunde beheben, Planung committen.
5. /speckit-implement Story für Story (ein Commit pro Story) bis zum nächsten
   GATE, Übergabe durchführen, dann stopp.
Wenn der Kontext über etwa 250k Tokens wächst: an der nächsten Story-Grenze mit
einer „in progress“-Übergabe in STATUS anhalten und mir Bescheid geben.
Sprich Deutsch mit mir.
```

## Ship and deploy

At every gate the agent runs a local review (`speckit-reviewer` subagent),
shows you the running app, and waits for your feedback. After you approve, it
ships according to the product's ship mode ([ADR 007](docs/adr/007-ship-flow.md)):

- `local-only`: local commits only.
- `expert-review`: `pnpm ship --mode expert-review` pushes the feature branch
  and opens or updates a PR. You (or an expert) review and merge.
- `auto-merge`: `pnpm ship --mode auto-merge` also waits for CI, merges, waits
  for the deployment, checks the live URL, and comments it on the PR.

Every push to `main` that passes `verify` deploys `dist/` to GitHub Pages
(`.github/workflows/ci.yml`). One-time setup per repository: **Settings → Pages →
Build and deployment → Source: GitHub Actions**. Pages needs a public
repository or GitHub Pro/Team, and the site is always public: fine for this
local-first app, because user data stays in each visitor's browser. Until Pages
is set up, CI skips the deployment and says why in the run summary, and
`pnpm ship` prints the steps. Both modes need the `gh` CLI logged in.

## Folder map

`src/` holds domain, storage, UI, and their unit tests; `e2e/` holds desktop/mobile
browser smoke tests. `.specify/` holds the constitution and template override
(plus Spec Kit's scripts/templates after `specify init`), `specs/NNN-*/` holds
one spec/plan/tasks set per feature (created by `/speckit-specify`; none ships
with the starter), `docs/STATUS.md` is the live checkpoint handoff, and
`docs/adr/` the decision record. Root configuration and
`.github/workflows/ci.yml` run the same local/CI gate. No environment file or
cloud credentials are needed.
