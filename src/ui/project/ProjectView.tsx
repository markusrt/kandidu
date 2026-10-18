import { useEffect } from "react";
import type { Project } from "../../domain/project";
import { useMessages } from "../i18n";
import { NotFound } from "../NotFound";
import { href, type ProjectStep } from "../router";
import { Stepper } from "../Stepper";
import { useSnapshot } from "../state";
import { LeadList } from "./LeadList";
import { LinksStep } from "./LinksStep";
import { PromptStep } from "./PromptStep";
import { ResponseStep } from "./ResponseStep";

/** Where to continue a project after a pause (FR-017). */
export function resumeStep(project: Project): ProjectStep {
  if (project.promptState === "answered") return "leads";
  if (project.promptState === "copied") return "antwort";
  return project.links.length > 0 ? "prompt" : "links";
}

export function ProjectView({
  projectId,
  step,
}: {
  projectId: string;
  step: ProjectStep | undefined;
}) {
  const m = useMessages();
  const snapshot = useSnapshot();
  const project = snapshot.projects.find((p) => p.id === projectId);

  useEffect(() => {
    if (project && !step) {
      window.location.replace(
        href({ name: "project", projectId, step: resumeStep(project) }),
      );
    }
  }, [project, projectId, step]);

  if (!project) return <NotFound />;
  if (!step) return null;

  const to = (s: ProjectStep) => ({
    name: "project" as const,
    projectId,
    step: s,
  });
  return (
    <>
      <p className="eyebrow">{project.title}</p>
      <Stepper
        label={m.project.stepsLabel}
        current={step}
        steps={[
          { key: "links", label: m.project.steps.links, to: to("links") },
          { key: "prompt", label: m.project.steps.prompt, to: to("prompt") },
          {
            key: "antwort",
            label: m.project.steps.response,
            to: to("antwort"),
          },
          { key: "leads", label: m.project.steps.leads, to: to("leads") },
        ]}
      />
      {step === "links" && <LinksStep project={project} />}
      {step === "prompt" && <PromptStep project={project} />}
      {step === "antwort" && <ResponseStep project={project} />}
      {step === "leads" && <LeadList project={project} />}
    </>
  );
}
