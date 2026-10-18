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
});
