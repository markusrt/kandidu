import { describe, expect, it } from "vitest";
import { href, parseRoute, type Route } from "./router";

describe("router", () => {
  it.each<[string, Route]>([
    ["", { name: "home" }],
    ["#/", { name: "home" }],
    ["#/einrichtung", { name: "setup", step: "profil" }],
    ["#/einrichtung/vorlagen", { name: "setup", step: "vorlagen" }],
    ["#/einrichtung/nachweise", { name: "setup", step: "nachweise" }],
    ["#/platzhalter", { name: "placeholders" }],
    ["#/projekte/p1", { name: "project", projectId: "p1", step: undefined }],
    [
      "#/projekte/p1/antwort",
      { name: "project", projectId: "p1", step: "antwort" },
    ],
    [
      "#/projekte/p1/leads/l1",
      { name: "lead", projectId: "p1", leadId: "l1", step: "pruefen" },
    ],
    [
      "#/projekte/p1/leads/l1/paket",
      { name: "lead", projectId: "p1", leadId: "l1", step: "paket" },
    ],
    ["#/projekte/p1/unbekannt", { name: "notFound" }],
    ["#/einrichtung/nachweise/x", { name: "notFound" }],
    ["#/projekte/%E0", { name: "notFound" }],
  ])("parses %s", (hash, route) => {
    expect(parseRoute(hash)).toEqual(route);
  });

  it("round-trips routes with encoded ids", () => {
    const route: Route = {
      name: "lead",
      projectId: "a b",
      leadId: "c/d",
      step: "freigabe",
    };
    expect(parseRoute(href(route))).toEqual(route);
  });
});
