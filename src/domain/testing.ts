import type { Lead } from "./lead";
import type { Profile } from "./profile";
import type { Project } from "./project";

// Synthetic records for tests only (constitution VII: no real personal data).

export function sampleProfile(): Profile {
  return {
    firstName: "Erika",
    lastName: "Musterfrau",
    street: "Musterweg 1",
    postalCode: "12345",
    city: "Musterstadt",
    phone: "030 1234567",
    email: "erika@example.org",
    updatedAt: "2026-10-18T10:00:00.000Z",
  };
}

export function sampleProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    title: "Ausbildung zum Industriekaufmann",
    links: [{ id: "l1", url: "https://example.org/stellen/123" }],
    promptContext: "",
    promptState: "draft",
    responses: [],
    responseDraft: "",
    createdAt: "2026-10-18T10:00:00.000Z",
    updatedAt: "2026-10-18T10:00:00.000Z",
    ...overrides,
  };
}

export function sampleLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead1",
    projectId: "p1",
    responseId: "r1",
    responseIndex: 0,
    sourceUrl: "https://example.org/stellen/123",
    position: { title: "Ausbildung zum Industriekaufmann (m/w/d)" },
    company: {
      name: "Beispiel GmbH",
      address: {
        street: "Hauptstraße 5",
        postalCode: "54321",
        city: "Beispielstadt",
      },
    },
    contact: {
      salutation: "Frau",
      title: "Dr.",
      firstName: "Eva",
      lastName: "Muster",
    },
    application: { channel: "email", email: "jobs@example.org" },
    process: "",
    research:
      "Die Beispiel GmbH stellt Beispiele her ([Quelle](https://example.org)).",
    motivation: "Absatz eins.\n\nAbsatz zwei.",
    status: "review",
    history: [{ id: "h1", status: "review", at: "2026-10-18T10:00:00.000Z" }],
    comments: [],
    packages: [],
    createdAt: "2026-10-18T10:00:00.000Z",
    updatedAt: "2026-10-18T10:00:00.000Z",
    ...overrides,
  };
}
