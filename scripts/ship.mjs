#!/usr/bin/env node
// Ships the current feature branch (ADR 007): push, create or reuse the PR, and
// for auto-merge also wait for checks, merge, wait for the Pages deployment,
// and verify the live URL. Requires an authenticated `gh` CLI.
// Usage:
//   node scripts/ship.mjs --mode expert-review|auto-merge
//     [--title <text> --body-file <file>]   (needed when no PR exists yet)
//     [--method rebase|merge|squash] [--dry-run]
// Exit codes: 0 done, 1 checks/deployment failed, 2 usage, 3 precondition.
import { execFileSync, spawnSync } from "node:child_process";

const WAIT_STEP_MS = 10_000;
const options = { method: "rebase", dryRun: false };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const flag = argv[i];
  if (flag === "--dry-run") options.dryRun = true;
  else if (["--mode", "--title", "--body-file", "--method"].includes(flag)) {
    options[flag.slice(2).replace(/-(\w)/g, (_, c) => c.toUpperCase())] =
      argv[++i];
  } else fail(2, `Unknown option: ${flag}`);
}
if (!["expert-review", "auto-merge"].includes(options.mode)) {
  fail(2, "--mode must be expert-review or auto-merge");
}
if (!["rebase", "merge", "squash"].includes(options.method)) {
  fail(2, "--method must be rebase, merge, or squash");
}

function fail(code, message) {
  console.error(`ship: ${message}`);
  process.exit(code);
}

function read(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

// Mutating or long-running commands: printed in dry-run, streamed otherwise.
function act(command, args) {
  console.log(`$ ${command} ${args.join(" ")}`);
  if (options.dryRun) return true;
  try {
    execFileSync(command, args, { stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
}

async function waitFor(what, attempts, probe) {
  for (let i = 0; i < attempts; i++) {
    const result = await probe();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, WAIT_STEP_MS));
  }
  fail(1, `Timed out waiting for ${what}.`);
}

const repo = read("gh", [
  "repo",
  "view",
  "--json",
  "nameWithOwner,defaultBranchRef",
  "--jq",
  '.nameWithOwner + " " + .defaultBranchRef.name',
]);
if (!repo) fail(3, "gh cannot read this repository. Run `gh auth login`.");
const [slug, base] = repo.split(" ");
const branch = read("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
if (!branch || branch === base) {
  fail(3, `Ship from a feature branch, not ${base}.`);
}
if (read("git", ["status", "--porcelain"])) {
  fail(3, "The worktree has uncommitted changes. Commit the slice first.");
}

const pages = read("gh", [
  "api",
  `repos/${slug}/pages`,
  "--jq",
  '.build_type + " " + .html_url',
]);
const [buildType, pagesUrl] = (pages ?? "").split(" ");
if (buildType !== "workflow") {
  const hint = [
    `GitHub Pages is not set up for GitHub Actions in ${slug}.`,
    "Enable it: Settings > Pages > Build and deployment > Source: GitHub Actions,",
    `or run: gh api -X POST repos/${slug}/pages -f build_type=workflow`,
    "Private repositories need GitHub Pro/Team for Pages; the site is public.",
  ].join("\n");
  if (options.mode === "auto-merge") fail(3, hint);
  console.log(`Note: ${hint}`);
}

if (!act("git", ["push", "-u", "origin", "HEAD"])) fail(1, "Push failed.");

let pr = read("gh", [
  "pr",
  "view",
  branch,
  "--json",
  "number,url,state",
  "--jq",
  'select(.state == "OPEN") | (.number|tostring) + " " + .url',
]);
if (!pr) {
  if (!options.title || !options.bodyFile) {
    fail(2, "No open PR for this branch: pass --title and --body-file.");
  }
  const created = act("gh", [
    "pr",
    "create",
    "--base",
    base,
    "--head",
    branch,
    "--title",
    options.title,
    "--body-file",
    options.bodyFile,
  ]);
  if (!created) fail(1, "PR creation failed.");
  pr = options.dryRun
    ? "<new> <new PR URL>"
    : read("gh", [
        "pr",
        "view",
        branch,
        "--json",
        "number,url",
        "--jq",
        '(.number|tostring) + " " + .url',
      ]);
}
const [number, prUrl] = pr.split(" ");
console.log(`PR: ${prUrl}`);

if (options.mode === "expert-review") {
  console.log("Mode expert-review: waiting for a human review and merge.");
  process.exit(0);
}
if (options.dryRun) {
  console.log(
    `Dry run: would wait for checks, merge with --${options.method}, wait for the ${base} deployment, and verify ${pagesUrl}.`,
  );
  process.exit(0);
}

// `gh pr checks` exits 8 while checks are pending, so only look for output.
await waitFor(
  "PR checks to start",
  30,
  () =>
    spawnSync("gh", ["pr", "checks", number], {
      encoding: "utf8",
    }).stdout?.trim().length > 0,
);
if (
  !act("gh", ["pr", "checks", number, "--watch", "--fail-fast", "-i", "15"])
) {
  fail(1, `Checks failed: ${prUrl}`);
}
if (
  !act("gh", ["pr", "merge", number, `--${options.method}`, "--delete-branch"])
) {
  fail(1, `Merge failed: ${prUrl}`);
}

const sha = read("gh", [
  "pr",
  "view",
  number,
  "--json",
  "mergeCommit",
  "--jq",
  ".mergeCommit.oid",
]);
const runId = await waitFor(`the ${base} workflow run`, 30, () =>
  read("gh", [
    "api",
    `repos/${slug}/actions/runs?head_sha=${sha}&branch=${base}&event=push`,
    "--jq",
    '.workflow_runs[] | select(.name == "Verify") | .id',
  ]),
);
const runUrl = `https://github.com/${slug}/actions/runs/${runId}`;
if (!act("gh", ["run", "watch", runId, "--exit-status", "-i", "15"])) {
  fail(1, `The ${base} run failed: ${runUrl}`);
}
const deployJob = read("gh", [
  "api",
  `repos/${slug}/actions/runs/${runId}/jobs`,
  "--jq",
  '.jobs[] | select(.name == "deploy") | .conclusion',
]);
if (deployJob !== "success") {
  fail(1, `Deployment did not succeed (${deployJob || "missing"}): ${runUrl}`);
}

await waitFor(`${pagesUrl} to respond`, 18, async () => {
  try {
    return (await fetch(pagesUrl, { cache: "no-store" })).ok;
  } catch {
    return false;
  }
});
act("gh", [
  "pr",
  "comment",
  number,
  "--body",
  `Deployed ${sha.slice(0, 7)} to ${pagesUrl} (run: ${runUrl}).`,
]);
console.log(`Live: ${pagesUrl}\nRun: ${runUrl}`);
