import { describe, expect, it } from "vitest";
import type { ParseResult } from "../domain/project";
import { balancedSpans, jsonCandidates, removeTrailingCommas } from "./extract";
import { parseResponse } from "./parse";

const files = import.meta.glob("./fixtures/*.txt", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function fixture(name: string): string {
  const text = files[`./fixtures/${name}.txt`];
  if (text === undefined) throw new Error(`missing fixture ${name}`);
  return text;
}

function leads(result: ParseResult) {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result)}`);
  return result.leads;
}

describe("LLM response corpus (SC-004)", () => {
  it("has at least ten synthetic answers", () => {
    expect(Object.keys(files).length).toBeGreaterThanOrEqual(10);
  });

  it.each([
    ["valid-plain", 1],
    ["valid-fenced", 1],
    ["valid-fence-nolang", 1],
    ["valid-prose", 1],
    ["valid-single-object", 1],
    ["valid-root-array", 2],
    ["valid-minimal", 1],
    ["valid-trailing-commas", 1],
    ["valid-typographic-quotes", 1],
    ["valid-two-blocks", 1],
    ["valid-warnings", 1],
    ["valid-three-leads", 3],
  ])("%s yields %i lead(s)", (name, count) => {
    const result = parseResponse(fixture(name));
    expect(leads(result)).toHaveLength(count);
    expect(leads(result)[0]?.company.name).toBeTruthy();
  });

  it.each([
    ["invalid-no-json", "no-json-found"],
    ["invalid-truncated", "json-invalid"],
    ["invalid-missing-company", "schema-invalid"],
    ["invalid-leads-wrong-type", "schema-invalid"],
    ["invalid-empty-leads", "schema-invalid"],
    ["invalid-partial", "schema-invalid"],
  ])("%s fails with %s and creates no leads", (name, error) => {
    const result = parseResponse(fixture(name));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(error);
  });
});

describe("parseResponse details", () => {
  it("maps a full entry to a lead draft", () => {
    const [lead] = leads(parseResponse(fixture("valid-plain")));
    expect(lead).toMatchObject({
      sourceUrl: "https://example.org/stellen/123",
      position: { title: "Ausbildung zum Industriekaufmann (m/w/d)" },
      company: { name: "Beispiel GmbH", address: { city: "Beispielstadt" } },
      contact: { salutation: "Frau", lastName: "Muster" },
      application: { channel: "email" },
    });
    expect(lead?.motivation.split("\n\n")).toHaveLength(2);
  });

  it("treats null and empty strings as absent and ignores unknown keys", () => {
    const [lead] = leads(parseResponse(fixture("valid-minimal")));
    expect(lead?.company).toEqual({ name: "Muster AG" });
    expect(lead?.contact).toBeUndefined();
    expect(lead?.application.channel).toBe("email");
    expect(lead?.process).toBe("");
    expect(lead && "unbekanntesFeld" in lead).toBe(false);
  });

  it("warns about unknown channels, long motivation and dropped URLs", () => {
    const result = parseResponse(fixture("valid-warnings"));
    if (!result.ok) throw new Error("expected ok");
    expect(result.warnings.map((w) => w.kind).sort()).toEqual([
      "channel-unknown",
      "motivation-too-long",
      "url-dropped",
    ]);
    expect(result.leads[0]?.application).toMatchObject({
      channel: "other",
      notes: expect.stringContaining("persönlich abgeben"),
    });
    expect(result.leads[0]?.sourceUrl).toBeUndefined();
  });

  it("names the field that is missing", () => {
    const result = parseResponse(fixture("invalid-missing-company"));
    expect(result).toMatchObject({
      ok: false,
      error: "schema-invalid",
      issues: [{ entry: 1, path: ["company", "name"], kind: "missing" }],
    });
  });

  it("keeps valid entries of a partly invalid answer", () => {
    const result = parseResponse(fixture("invalid-partial"));
    if (result.ok || result.error !== "schema-invalid") throw new Error("bad");
    expect(result.validLeads).toHaveLength(1);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        { entry: 2, path: ["research"], kind: "missing" },
        { entry: 2, path: ["position", "title"], kind: "wrong-type" },
      ]),
    );
  });

  it("reports wrong root types and empty lists", () => {
    expect(parseResponse(fixture("invalid-leads-wrong-type"))).toMatchObject({
      issues: [{ entry: 0, path: ["leads"], kind: "wrong-type" }],
    });
    expect(parseResponse('{"foo": 1}')).toMatchObject({
      issues: [{ entry: 0, path: ["leads"], kind: "missing" }],
    });
  });

  it("rejects oversized answers", () => {
    expect(parseResponse("x".repeat(500_001))).toEqual({
      ok: false,
      error: "response-too-large",
    });
  });

  it("coerces numbers to text", () => {
    const json = JSON.stringify({
      leads: [
        {
          position: { title: "Stelle", referenceNumber: 4711 },
          company: { name: "Firma", address: { postalCode: 12345 } },
          application: { channel: "post" },
          research: "r",
          motivation: "m",
        },
      ],
    });
    const [lead] = leads(parseResponse(json));
    expect(lead?.position.referenceNumber).toBe("4711");
    expect(lead?.company.address?.postalCode).toBe("12345");
  });
});

describe("extract helpers", () => {
  it("finds balanced spans and ignores brackets in strings", () => {
    expect(balancedSpans('a {"x": "}{"} b [1, [2]] c')).toEqual([
      '{"x": "}{"}',
      "[1, [2]]",
    ]);
  });

  it("removes trailing commas outside strings only", () => {
    expect(removeTrailingCommas('{"a": [1, 2,], "b": ",]",}')).toBe(
      '{"a": [1, 2], "b": ",]"}',
    );
  });

  it("orders candidates: whole text, fences, spans", () => {
    const text = 'Text ```json\n{"a":1}\n``` und {"b":2}';
    expect(jsonCandidates(text)).toEqual([text, '{"a":1}', '{"b":2}']);
  });
});
