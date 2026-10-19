import { describe, expect, it } from "vitest";
import {
  normalizeTag,
  normalizeTags,
  suggestTags,
  TAG_MAX,
  TagError,
  tagsInUse,
} from "./tags";

describe("normalizeTag", () => {
  it("trims, lower-cases and collapses inner whitespace", () => {
    expect(normalizeTag("  Zeugnis ")).toBe("zeugnis");
    expect(normalizeTag("Foo \t  Bar")).toBe("foo bar");
    expect(normalizeTag("   ")).toBe("");
  });

  it("treats composed and decomposed umlauts as equal (NFC)", () => {
    const composed = "Schulzeugnis Ä";
    const decomposed = "Schulzeugnis Ä";
    expect(normalizeTag(decomposed)).toBe(normalizeTag(composed));
    expect(normalizeTag(decomposed)).toBe("schulzeugnis ä");
  });

  it("accepts exactly 40 characters and rejects more", () => {
    expect(normalizeTag("a".repeat(TAG_MAX))).toBe("a".repeat(TAG_MAX));
    expect(() => normalizeTag("a".repeat(TAG_MAX + 1))).toThrow(TagError);
    try {
      normalizeTag("a".repeat(TAG_MAX + 1));
    } catch (error) {
      expect((error as TagError).code).toBe("tag-invalid");
    }
  });
});

describe("normalizeTags", () => {
  it("drops empty tags and duplicates, keeping first-seen order", () => {
    expect(normalizeTags(["Zeugnis", " ", "B", "zeugnis", "  b "])).toEqual([
      "zeugnis",
      "b",
    ]);
  });
});

describe("suggestTags", () => {
  it("lists predefined tags first for empty input, then own tags", () => {
    const result = suggestTags("", ["alpha"]);
    expect(result.slice(0, 5).sort()).toEqual([
      "arbeitszeugnis",
      "referenz",
      "schulzeugnis",
      "zertifikat",
      "zeugnis",
    ]);
    expect(result[5]).toBe("alpha");
  });

  it("puts prefix matches before substring matches", () => {
    expect(suggestTags("zeug", [])).toEqual([
      "zeugnis",
      "arbeitszeugnis",
      "schulzeugnis",
    ]);
  });

  it("suggests tags already used by the user", () => {
    expect(suggestTags("proj", ["projekt x"])).toEqual(["projekt x"]);
  });

  it("excludes already chosen tags", () => {
    expect(suggestTags("zeug", [], ["Zeugnis"])).toEqual([
      "arbeitszeugnis",
      "schulzeugnis",
    ]);
  });

  it("matches case-insensitively", () => {
    expect(suggestTags("ZEU", [])[0]).toBe("zeugnis");
  });

  it("returns at most 10 suggestions", () => {
    const many = Array.from({ length: 20 }, (_, i) => `tag ${i}`);
    expect(suggestTags("", many)).toHaveLength(10);
    expect(suggestTags("tag", many)).toHaveLength(10);
  });

  it("returns nothing instead of throwing for over-long input", () => {
    expect(suggestTags("z".repeat(41), [])).toEqual([]);
  });
});

describe("tagsInUse", () => {
  it("returns unique tags sorted alphabetically", () => {
    expect(
      tagsInUse([{ tags: ["b", "a"] }, { tags: ["b", "c"] }, { tags: [] }]),
    ).toEqual(["a", "b", "c"]);
  });
});
