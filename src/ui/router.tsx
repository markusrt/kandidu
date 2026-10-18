import { type ReactNode, useEffect, useState } from "react";

// Hash routes (contracts/ui-routes.md). Route words are stable identifiers.

export type SetupStep = "profil" | "vorlagen" | "lebenslauf";
export type ProjectStep = "links" | "prompt" | "antwort" | "leads";
export type LeadStep = "pruefen" | "anschreiben" | "freigabe" | "paket";

export type Route =
  | { readonly name: "home" }
  | { readonly name: "setup"; readonly step: SetupStep }
  | { readonly name: "placeholders" }
  | {
      readonly name: "project";
      readonly projectId: string;
      readonly step: ProjectStep | undefined;
    }
  | {
      readonly name: "lead";
      readonly projectId: string;
      readonly leadId: string;
      readonly step: LeadStep;
    }
  | { readonly name: "notFound" };

const SETUP_STEPS: readonly SetupStep[] = ["profil", "vorlagen", "lebenslauf"];
const PROJECT_STEPS: readonly ProjectStep[] = [
  "links",
  "prompt",
  "antwort",
  "leads",
];
const LEAD_STEPS: readonly LeadStep[] = [
  "pruefen",
  "anschreiben",
  "freigabe",
  "paket",
];

function oneOf<T extends string>(
  values: readonly T[],
  value: string | undefined,
): value is T {
  return value !== undefined && (values as readonly string[]).includes(value);
}

/** A malformed escape such as `%E0` must not crash the app. */
function decodePart(part: string): string | undefined {
  try {
    return decodeURIComponent(part);
  } catch {
    return undefined;
  }
}

export function parseRoute(hash: string): Route {
  const parts = hash
    .replace(/^#\/?/, "")
    .split("/")
    .filter(Boolean)
    .map(decodePart);
  if (parts.some((part) => part === undefined)) return { name: "notFound" };
  const [first, second, third, fourth, fifth] = parts;
  if (parts.length === 0) return { name: "home" };
  if (first === "einrichtung") {
    if (parts.length === 1) return { name: "setup", step: "profil" };
    if (parts.length === 2 && oneOf(SETUP_STEPS, second)) {
      return { name: "setup", step: second };
    }
  }
  if (first === "platzhalter" && parts.length === 1) {
    return { name: "placeholders" };
  }
  if (first === "projekte" && second) {
    if (parts.length === 2) {
      return { name: "project", projectId: second, step: undefined };
    }
    if (parts.length === 3 && oneOf(PROJECT_STEPS, third)) {
      return { name: "project", projectId: second, step: third };
    }
    if (third === "leads" && fourth) {
      if (parts.length === 4) {
        return {
          name: "lead",
          projectId: second,
          leadId: fourth,
          step: "pruefen",
        };
      }
      if (parts.length === 5 && oneOf(LEAD_STEPS, fifth)) {
        return { name: "lead", projectId: second, leadId: fourth, step: fifth };
      }
    }
  }
  return { name: "notFound" };
}

export function href(route: Route): string {
  const enc = encodeURIComponent;
  switch (route.name) {
    case "home":
      return "#/";
    case "setup":
      return `#/einrichtung/${route.step}`;
    case "placeholders":
      return "#/platzhalter";
    case "project":
      return route.step
        ? `#/projekte/${enc(route.projectId)}/${route.step}`
        : `#/projekte/${enc(route.projectId)}`;
    case "lead":
      return `#/projekte/${enc(route.projectId)}/leads/${enc(route.leadId)}/${route.step}`;
    case "notFound":
      return "#/";
  }
}

export function navigate(route: Route): void {
  window.location.hash = href(route).slice(1);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const update = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return route;
}

export function Link({
  to,
  children,
  className,
}: {
  to: Route;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a href={href(to)} className={className}>
      {children}
    </a>
  );
}
