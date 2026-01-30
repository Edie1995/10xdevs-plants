import type { DiseaseCommand } from "../../types";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface DiseaseEntryRowProps {
  index: number;
  value: DiseaseCommand;
  error?: { name?: string; symptoms?: string; advice?: string };
  onChange: (patch: Partial<DiseaseCommand>) => void;
  onRemove: () => void;
}

const textareaStyles =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive dark:aria-invalid:ring-destructive/40 dark:bg-input/30 min-h-[100px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]";

export default function DiseaseEntryRow({ index, value, error, onChange, onRemove }: DiseaseEntryRowProps) {
  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium text-neutral-700" htmlFor={`disease-name-${index}`}>
            Nazwa choroby *
          </label>
          <Input
            id={`disease-name-${index}`}
            value={value.name ?? ""}
            onChange={(event) => onChange({ name: event.target.value })}
            maxLength={50}
            placeholder="np. Zgnilizna korzeni"
            aria-invalid={Boolean(error?.name)}
            aria-describedby={error?.name ? `disease-name-${index}-error` : undefined}
          />
          {error?.name ? (
            <p id={`disease-name-${index}-error`} className="mt-1 text-xs text-red-600" role="alert">
              {error.name}
            </p>
          ) : null}
        </div>
        <Button type="button" variant="ghost" onClick={onRemove} className="text-red-600 hover:text-red-700">
          Usun
        </Button>
      </div>
      <div>
        <label className="text-sm font-medium text-neutral-700" htmlFor={`disease-symptoms-${index}`}>
          Objawy
        </label>
        <textarea
          id={`disease-symptoms-${index}`}
          className={cn(textareaStyles)}
          value={value.symptoms ?? ""}
          onChange={(event) => onChange({ symptoms: event.target.value })}
          maxLength={2000}
          aria-invalid={Boolean(error?.symptoms)}
          aria-describedby={error?.symptoms ? `disease-symptoms-${index}-error` : undefined}
        />
        {error?.symptoms ? (
          <p id={`disease-symptoms-${index}-error`} className="mt-1 text-xs text-red-600" role="alert">
            {error.symptoms}
          </p>
        ) : null}
      </div>
      <div>
        <label className="text-sm font-medium text-neutral-700" htmlFor={`disease-advice-${index}`}>
          Zalecenia
        </label>
        <textarea
          id={`disease-advice-${index}`}
          className={cn(textareaStyles)}
          value={value.advice ?? ""}
          onChange={(event) => onChange({ advice: event.target.value })}
          maxLength={2000}
          aria-invalid={Boolean(error?.advice)}
          aria-describedby={error?.advice ? `disease-advice-${index}-error` : undefined}
        />
        {error?.advice ? (
          <p id={`disease-advice-${index}-error`} className="mt-1 text-xs text-red-600" role="alert">
            {error.advice}
          </p>
        ) : null}
      </div>
    </div>
  );
}
