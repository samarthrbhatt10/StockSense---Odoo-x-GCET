import { CheckIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PASSWORD_RULES, passwordRuleResults } from "../schemas";

type PasswordRulesProps = {
  value: string;
  className?: string;
};

/** Live checklist of the server's password rules. */
export function PasswordRules({ value, className }: PasswordRulesProps) {
  const results = passwordRuleResults(value);

  return (
    <ul className={cn("space-y-1", className)}>
      {PASSWORD_RULES.map((rule, index) => {
        const passed = results[index] ?? false;
        return (
          <li
            key={rule}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              passed ? "text-emerald-600" : "text-muted-foreground",
            )}
          >
            {passed ? (
              <CheckIcon className="size-3.5 shrink-0" />
            ) : (
              <XIcon className="size-3.5 shrink-0 opacity-50" />
            )}
            {rule}
          </li>
        );
      })}
    </ul>
  );
}
