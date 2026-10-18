#!/usr/bin/env node
// Reports which models actually ran in a Claude Code session, from its local
// transcripts, and checks them against the routing in AGENTS.md (ADR 006).
// Read-only. Usage:
//   node scripts/check-model-routing.mjs [--session <id>] [--cwd <dir>]
//     [--expect-main opus] [--expect-agent <type>=<model>]...
//     [--require <type>]... [--require-agent]
// Defaults: main opus, speckit-implementer sonnet, speckit-reviewer opus.
// --require fails if that agent type never ran; --require-agent is
// shorthand for --require speckit-implementer.
// Exit codes: 0 ok, 1 routing mismatch, 2 no transcript found.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function parseArgs(argv) {
  const options = {
    cwd: process.cwd(),
    session: undefined,
    expectMain: "opus",
    expectAgents: new Map([
      ["speckit-implementer", "sonnet"],
      ["speckit-reviewer", "opus"],
    ]),
    required: new Set(),
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === "--cwd") options.cwd = value;
    else if (flag === "--session") options.session = value;
    else if (flag === "--expect-main") options.expectMain = value;
    else if (flag === "--expect-agent") {
      const [type, model] = value.split("=");
      options.expectAgents.set(type, model);
    } else if (flag === "--require") options.required.add(value);
    else if (flag === "--require-agent") {
      options.required.add("speckit-implementer");
      continue;
    } else throw new Error(`Unknown option: ${flag}`);
    i++;
  }
  return options;
}

// Claude Code stores a project's transcripts under its cwd with every
// non-alphanumeric character replaced by "-".
function projectDir(cwd) {
  const base = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
  return join(base, "projects", cwd.replace(/[^A-Za-z0-9]/g, "-"));
}

function newestSession(dir) {
  const sessions = readdirSync(dir)
    .filter((name) => name.endsWith(".jsonl"))
    .map((name) => ({ name, mtime: statSync(join(dir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return sessions[0]?.name.replace(/\.jsonl$/, "");
}

function modelCounts(file) {
  const counts = new Map();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.includes('"assistant"')) continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    const model = record.type === "assistant" ? record.message?.model : null;
    if (!model || model === "<synthetic>") continue;
    counts.set(model, (counts.get(model) ?? 0) + 1);
  }
  return counts;
}

function format(counts) {
  return (
    [...counts].map(([model, n]) => `${model} (${n})`).join(", ") || "none"
  );
}

function matches(counts, expected) {
  return (
    counts.size > 0 && [...counts.keys()].every((m) => m.includes(expected))
  );
}

const options = parseArgs(process.argv.slice(2));
const dir = projectDir(options.cwd);
const session = options.session ?? (existsSync(dir) && newestSession(dir));
if (!session || !existsSync(join(dir, `${session}.jsonl`))) {
  console.error(`No Claude Code transcript found in ${dir}`);
  process.exit(2);
}

const failures = new Set();
const main = modelCounts(join(dir, `${session}.jsonl`));
const rows = [["main session", format(main), options.expectMain]];
if (!matches(main, options.expectMain)) failures.add("main session");

const subagentDir = join(dir, session, "subagents");
const seen = new Set();
if (existsSync(subagentDir)) {
  for (const name of readdirSync(subagentDir).filter((n) =>
    n.endsWith(".jsonl"),
  )) {
    const metaFile = join(subagentDir, name.replace(/\.jsonl$/, ".meta.json"));
    const type = existsSync(metaFile)
      ? (JSON.parse(readFileSync(metaFile, "utf8")).agentType ?? "unknown")
      : "unknown";
    const counts = modelCounts(join(subagentDir, name));
    const expected = options.expectAgents.get(type);
    rows.push([
      `${type} ${name.replace(/\.jsonl$/, "")}`,
      format(counts),
      expected ?? "-",
    ]);
    seen.add(type);
    if (expected && !matches(counts, expected)) failures.add(type);
  }
}
for (const type of options.required) {
  if (!seen.has(type)) failures.add(`${type} (never ran)`);
}

console.log(`Session ${session}\n`);
console.log("| Agent | Models (responses) | Expected |\n| --- | --- | --- |");
for (const [agent, models, expected] of rows) {
  console.log(`| ${agent} | ${models} | ${expected} |`);
}
if (failures.size > 0) {
  console.log(`\nRouting mismatch: ${[...failures].join(", ")}`);
  process.exit(1);
}
console.log("\nRouting OK");
