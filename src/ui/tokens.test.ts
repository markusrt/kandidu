import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Design tokens (specs/002-visual-design, FR-001, FR-008, SC-006).
const dir = new URL(".", import.meta.url).pathname;
const read = (name: string) => readFileSync(join(dir, name), "utf8");

function tokens(): Map<string, string> {
  const map = new Map<string, string>();
  for (const [, name, value] of read("tokens.css").matchAll(
    /(--[\w-]+):\s*(#[0-9a-f]{6})\b/gi,
  )) {
    map.set(name as string, (value as string).toLowerCase());
  }
  return map;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

describe("design tokens", () => {
  it("keeps color literals inside tokens.css only", () => {
    const offenders = readdirSync(dir)
      .filter((name) => name.endsWith(".css") && name !== "tokens.css")
      .flatMap((name) =>
        read(name)
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .split("\n")
          .map((line, i) => ({ name, line: i + 1, text: line }))
          .filter(({ text }) =>
            /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?)\(/i.test(text),
          ),
      );
    expect(offenders).toEqual([]);
  });

  const t = tokens();
  const pairs: [string, string, number][] = [
    ["--ink", "--page", 4.5],
    ["--ink", "--paper", 4.5],
    ["--muted", "--page", 4.5],
    ["--muted", "--paper", 4.5],
    ["--muted", "--accent-soft", 4.5],
    ["--accent", "--paper", 4.5],
    ["--accent", "--page", 4.5],
    ["--accent-hover", "--paper", 4.5],
    ["--accent-ink", "--accent", 4.5],
    ["--accent-ink", "--accent-hover", 4.5],
    ["--accent-ink", "--error", 4.5],
    ["--error", "--error-soft", 4.5],
    ["--warn", "--warn-soft", 4.5],
    ["--ok", "--ok-soft", 4.5],
    ["--border-strong", "--paper", 3],
    ["--border-strong", "--page", 3],
    ["--focus", "--paper", 3],
    ["--focus", "--page", 3],
  ];
  it.each(pairs)("%s on %s reaches %s:1", (fg, bg, min) => {
    const a = t.get(fg);
    const b = t.get(bg);
    expect(a, fg).toBeDefined();
    expect(b, bg).toBeDefined();
    expect(contrast(a as string, b as string)).toBeGreaterThanOrEqual(min);
  });
});
