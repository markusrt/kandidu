import type { Project } from "../domain/project";
import { responseJsonSchema } from "../llm/schema";
import type { Messages } from "./i18n";

/**
 * The exact prompt text shown and copied (FR-013, FR-014). Built only from the
 * project title, links and the optional user context, never from the profile.
 */
export function buildPrompt(project: Project, m: Messages): string {
  return m.prompt.build({
    title: project.title,
    links: project.links.map((link) => link.url),
    context: project.promptContext,
    schemaJson: responseJsonSchema(),
  });
}
