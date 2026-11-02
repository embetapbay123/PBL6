import { Check } from "lucide-react";

/** Shows only recorded milestones. Callers decide the current step from server data. */
export function ProgressSteps({
  steps,
  current,
  label,
}: {
  steps: string[];
  current: number;
  label: string;
}) {
  return (
    <ol className="ui-progress-steps" aria-label={label}>
      {steps.map((step, index) => (
        <li
          key={step}
          className={
            index < current
              ? "is-complete"
              : index === current
                ? "is-current"
                : ""
          }
          aria-current={index === current ? "step" : undefined}
        >
          <span aria-hidden="true">
            {index < current ? <Check size={15} /> : index + 1}
          </span>
          <strong>{step}</strong>
        </li>
      ))}
    </ol>
  );
}
