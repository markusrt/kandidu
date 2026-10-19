import { describe, expect, it } from "vitest";
import { sampleProfile, sampleProject } from "../domain/testing";
import { catalogs } from "./i18n";
import { buildPrompt } from "./prompt";

const { de } = catalogs;

describe("buildPrompt (FR-013, FR-014)", () => {
  const project = sampleProject({
    links: [
      { id: "a", url: "https://example.org/stellen/123" },
      { id: "b", url: "https://example.org/stellen/456" },
    ],
  });

  it("contains title, every link and the JSON schema", () => {
    const prompt = buildPrompt(project, de);
    expect(prompt).toContain("Projekt: Ausbildung zum Industriekaufmann");
    expect(prompt).toContain("1. https://example.org/stellen/123");
    expect(prompt).toContain("2. https://example.org/stellen/456");
    expect(prompt).toContain('"leads"');
    expect(prompt).toContain('"motivation"');
  });

  it("includes the user context only when it is not empty", () => {
    expect(buildPrompt(project, de)).not.toContain("Zusätzlicher Kontext");
    const withContext = buildPrompt(
      { ...project, promptContext: "Ich mag Zahlen." },
      de,
    );
    expect(withContext).toContain("Zusätzlicher Kontext");
    expect(withContext).toContain("Ich mag Zahlen.");
  });

  it("asks for the original posting, the address and the sources (FR-051, FR-052)", () => {
    const prompt = buildPrompt(project, de);
    expect(prompt).toContain('"sourceUrl": der Link der Stellenanzeige');
    expect(prompt).toContain("Original-Ausschreibung");
    expect(prompt).toContain("Karriereseite");
    expect(prompt).toContain("Vergütung");
    expect(prompt).toContain("nur an, wenn du sicher bist");
    expect(prompt).toContain("recherchiere Anschrift und Website");
    expect(prompt).toContain("Erfinde keine Anschrift");
    expect(prompt).toContain('"sources"');
    expect(prompt).toContain('"originalPostingUrl"');
  });

  it("does not put the project's Stelle into the prompt (FR-014)", () => {
    expect(
      buildPrompt({ ...project, position: "Geheimtipp-Stelle" }, de),
    ).not.toContain("Geheimtipp-Stelle");
  });

  it("never contains profile values", () => {
    const prompt = buildPrompt(project, de);
    const profile = sampleProfile();
    for (const value of [
      profile.firstName,
      profile.lastName,
      profile.street,
      profile.email,
      profile.phone,
      profile.postalCode,
    ]) {
      expect(prompt).not.toContain(value);
    }
  });
});
