import { describe, expect, it } from "vitest";
import { responseJsonSchema } from "./schema";

describe("responseJsonSchema", () => {
  it("describes required fields and the channel enum", () => {
    const schema = JSON.parse(responseJsonSchema());
    const lead = schema.properties.leads.items;
    expect(schema.required).toEqual(["leads"]);
    expect(lead.required).toEqual(
      expect.arrayContaining([
        "position",
        "company",
        "application",
        "research",
        "motivation",
      ]),
    );
    expect(lead.properties.company.required).toEqual(["name"]);
    expect(lead.properties.application.properties.channel.enum).toEqual([
      "portal",
      "email",
      "post",
      "other",
    ]);
  });

  it("offers the optional original posting and sources (FR-051)", () => {
    const lead = JSON.parse(responseJsonSchema()).properties.leads.items;
    expect(lead.required).not.toContain("originalPostingUrl");
    expect(lead.required).not.toContain("sources");
    expect(lead.properties.originalPostingUrl.type).toBe("string");
    expect(lead.properties.sources.type).toBe("array");
    expect(lead.properties.sources.maxItems).toBe(20);
    expect(lead.properties.sources.items.required).toEqual(["url"]);
  });
});
