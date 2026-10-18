import { useMessages } from "../i18n";
import type { SetupStep } from "../router";
import { Stepper } from "../Stepper";
import { CvStep } from "./CvStep";
import { ProfileStep } from "./ProfileStep";
import { TemplatesStep } from "./TemplatesStep";

export function SetupView({ step }: { step: SetupStep }) {
  const m = useMessages();
  return (
    <>
      <p className="eyebrow">{m.setup.heading}</p>
      <Stepper
        label={m.setup.stepsLabel}
        current={step}
        steps={[
          {
            key: "profil",
            label: m.setup.steps.profile,
            to: { name: "setup", step: "profil" },
          },
          {
            key: "vorlagen",
            label: m.setup.steps.templates,
            to: { name: "setup", step: "vorlagen" },
          },
          {
            key: "lebenslauf",
            label: m.setup.steps.cv,
            to: { name: "setup", step: "lebenslauf" },
          },
        ]}
      />
      {step === "profil" && <ProfileStep />}
      {step === "vorlagen" && <TemplatesStep />}
      {step === "lebenslauf" && <CvStep />}
    </>
  );
}
