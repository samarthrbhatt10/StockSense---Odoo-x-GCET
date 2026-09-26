import type { ReactNode } from "react";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StepIndicatorProps = {
  steps: readonly string[];
  /** 1-based index of the step the user is on. */
  current: number;
  className?: string;
};

export function StepIndicator({ steps, current, className }: StepIndicatorProps) {
  return (
    <ol className={cn("flex items-center gap-2", className)}>
      {steps.map((label, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors",
                done && "bg-primary text-primary-foreground",
                active && "bg-primary text-primary-foreground",
                !done && !active && "bg-muted text-muted-foreground",
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? <CheckIcon className="size-3.5" /> : step}
            </span>
            <span
              className={cn(
                "hidden text-xs sm:inline",
                active ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {step < steps.length ? (
              <span aria-hidden className="h-px w-4 bg-border sm:w-6" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

type AuthCardHeaderProps = {
  title: string
  description?: string
  children?: ReactNode;
};

export function AuthCardHeader({ title, description, children }: AuthCardHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

type FormAlertProps = {
  children: ReactNode;
};

export function FormAlert({ children }: FormAlertProps) {
  return (
    <p
      role="alert"
      className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {children}
    </p>
  );
}
