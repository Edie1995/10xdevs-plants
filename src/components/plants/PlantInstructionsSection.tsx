import type { NewPlantFormErrors, NewPlantFormValues } from "../../lib/plants/new-plant-viewmodel";
import { cn } from "../../lib/utils";

interface PlantInstructionsSectionProps {
  values: NewPlantFormValues;
  errors: NewPlantFormErrors;
  onChange: (patch: Partial<NewPlantFormValues>) => void;
}

  const textareaStyles =
    "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive dark:aria-invalid:ring-destructive/40 dark:bg-input/30 min-h-[120px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]";

const maxLength = 2000;

export default function PlantInstructionsSection({ values, errors, onChange }: PlantInstructionsSectionProps) {
  const wateringError = errors.fields?.watering_instructions;
  const repottingError = errors.fields?.repotting_instructions;
  const propagationError = errors.fields?.propagation_instructions;
  const notesError = errors.fields?.notes;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-neutral-900">Instrukcje i notatki</h2>
        <p className="text-sm text-neutral-600">Dodatkowe informacje dotyczace pielegnacji.</p>
      </div>
      <div className="grid gap-4">
        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="watering-instructions">
            Podlewanie
          </label>
          <textarea
            id="watering-instructions"
            className={cn(textareaStyles)}
            value={values.watering_instructions ?? ""}
            onChange={(event) => onChange({ watering_instructions: event.target.value })}
            maxLength={maxLength}
            aria-invalid={Boolean(wateringError)}
            aria-describedby={wateringError ? "watering-instructions-error" : "watering-instructions-counter"}
          />
          <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
            <span id="watering-instructions-counter">
              {(values.watering_instructions ?? "").length}/{maxLength}
            </span>
            {wateringError ? (
              <span id="watering-instructions-error" className="text-red-600" role="alert">
                {wateringError}
              </span>
            ) : null}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="repotting-instructions">
            Przesadzanie
          </label>
          <textarea
            id="repotting-instructions"
            className={cn(textareaStyles)}
            value={values.repotting_instructions ?? ""}
            onChange={(event) => onChange({ repotting_instructions: event.target.value })}
            maxLength={maxLength}
            aria-invalid={Boolean(repottingError)}
            aria-describedby={repottingError ? "repotting-instructions-error" : "repotting-instructions-counter"}
          />
          <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
            <span id="repotting-instructions-counter">
              {(values.repotting_instructions ?? "").length}/{maxLength}
            </span>
            {repottingError ? (
              <span id="repotting-instructions-error" className="text-red-600" role="alert">
                {repottingError}
              </span>
            ) : null}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="propagation-instructions">
            Rozmnazanie
          </label>
          <textarea
            id="propagation-instructions"
            className={cn(textareaStyles)}
            value={values.propagation_instructions ?? ""}
            onChange={(event) => onChange({ propagation_instructions: event.target.value })}
            maxLength={maxLength}
            aria-invalid={Boolean(propagationError)}
            aria-describedby={
              propagationError ? "propagation-instructions-error" : "propagation-instructions-counter"
            }
          />
          <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
            <span id="propagation-instructions-counter">
              {(values.propagation_instructions ?? "").length}/{maxLength}
            </span>
            {propagationError ? (
              <span id="propagation-instructions-error" className="text-red-600" role="alert">
                {propagationError}
              </span>
            ) : null}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="plant-notes">
            Notatki
          </label>
          <textarea
            id="plant-notes"
            className={cn(textareaStyles)}
            value={values.notes ?? ""}
            onChange={(event) => onChange({ notes: event.target.value })}
            maxLength={maxLength}
            aria-invalid={Boolean(notesError)}
            aria-describedby={notesError ? "plant-notes-error" : "plant-notes-counter"}
          />
          <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
            <span id="plant-notes-counter">{(values.notes ?? "").length}/{maxLength}</span>
            {notesError ? (
              <span id="plant-notes-error" className="text-red-600" role="alert">
                {notesError}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
