import { useMessages } from "./i18n";
import { href, type Route } from "./router";

export interface Step {
  readonly key: string;
  readonly label: string;
  readonly to: Route;
}

/** Accessible step navigation: an ordered list with the current step marked. */
export function Stepper({
  label,
  steps,
  current,
}: {
  label: string;
  steps: readonly Step[];
  current: string;
}) {
  const m = useMessages();
  const index = steps.findIndex((step) => step.key === current);
  return (
    <nav aria-label={label} className="stepper">
      <p className="stepper-progress">
        {m.common.stepOf(index + 1, steps.length)}
      </p>
      <ol>
        {steps.map((step, i) => (
          <li
            key={step.key}
            className={i === index ? "current" : i < index ? "done" : undefined}
          >
            <a
              href={href(step.to)}
              aria-current={i === index ? "step" : undefined}
            >
              <span className="stepper-number" aria-hidden="true">
                {i + 1}
              </span>
              <span>{step.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
