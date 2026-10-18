import { describe, expect, it } from "vitest";
import { exceedsMotivationLimit, splitParagraphs } from "./motivation";

describe("splitParagraphs", () => {
  it("splits on blank lines and trims", () => {
    expect(splitParagraphs(" Eins\nzwei \n\n  Drei \r\n \r\nVier")).toEqual([
      "Eins\nzwei",
      "Drei",
      "Vier",
    ]);
  });

  it("drops empty paragraphs", () => {
    expect(splitParagraphs("\n\n\n")).toEqual([]);
  });

  it("flags more than two paragraphs", () => {
    expect(exceedsMotivationLimit("a\n\nb")).toBe(false);
    expect(exceedsMotivationLimit("a\n\nb\n\nc")).toBe(true);
  });
});
