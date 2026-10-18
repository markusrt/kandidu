import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown } from "./Markdown";

const render = (text: string) =>
  renderToStaticMarkup(createElement(Markdown, { text }));

describe("Markdown (research R6)", () => {
  it("renders formatting and safe links in a new tab", () => {
    const html = render("**fett** und [Quelle](https://example.org)\n\n- eins");
    expect(html).toContain("<strong>fett</strong>");
    expect(html).toContain(
      '<a href="https://example.org" target="_blank" rel="noopener noreferrer">Quelle</a>',
    );
    expect(html).toContain("<li>eins</li>");
  });

  it("never renders images or raw HTML", () => {
    const html = render(
      '![Bild](https://tracker.example/pixel.png) <img src="x"> <script>alert(1)</script>',
    );
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("tracker.example");
  });

  it("removes javascript links", () => {
    const html = render("[klick](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
  });
});
