import { useMessages } from "../i18n";
import { NotFound } from "../NotFound";
import { type LeadStep, Link } from "../router";
import { Stepper } from "../Stepper";
import { useSnapshot } from "../state";
import { CoverLetterStep } from "./CoverLetterStep";
import { GateStep } from "./GateStep";
import { HistoryView } from "./HistoryView";
import { PackageStep } from "./PackageStep";
import { ReviewStep } from "./ReviewStep";

export function LeadView({
  projectId,
  leadId,
  step,
}: {
  projectId: string;
  leadId: string;
  step: LeadStep;
}) {
  const m = useMessages();
  const snapshot = useSnapshot();
  const project = snapshot.projects.find((p) => p.id === projectId);
  const lead = snapshot.leads.find(
    (l) => l.id === leadId && l.projectId === projectId,
  );
  if (!project || !lead) return <NotFound />;

  const to = (s: LeadStep) => ({
    name: "lead" as const,
    projectId,
    leadId,
    step: s,
  });
  return (
    <>
      <p className="eyebrow">
        {m.lead.eyebrow(project.title, lead.company.name)}
      </p>
      <p>
        <Link to={{ name: "project", projectId, step: "leads" }}>
          {m.lead.backToProject(project.title)}
        </Link>
      </p>
      <p className="status-line">
        {m.lead.statusLine(m.leads.status[lead.status])}
      </p>
      <Stepper
        label={m.lead.stepsLabel}
        current={step}
        steps={[
          { key: "pruefen", label: m.lead.steps.review, to: to("pruefen") },
          {
            key: "anschreiben",
            label: m.lead.steps.coverLetter,
            to: to("anschreiben"),
          },
          { key: "freigabe", label: m.lead.steps.gate, to: to("freigabe") },
          { key: "paket", label: m.lead.steps.package, to: to("paket") },
          { key: "verlauf", label: m.lead.steps.history, to: to("verlauf") },
        ]}
      />
      {step === "pruefen" && <ReviewStep lead={lead} />}
      {step === "anschreiben" && <CoverLetterStep lead={lead} />}
      {step === "freigabe" && <GateStep lead={lead} />}
      {step === "paket" && <PackageStep lead={lead} />}
      {step === "verlauf" && <HistoryView lead={lead} />}
    </>
  );
}
