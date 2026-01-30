import type { DifficultyLevel } from "../../types";
import type { NewPlantFormErrors, NewPlantFormValues } from "../../lib/plants/new-plant-viewmodel";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface PlantBasicsSectionProps {
  values: NewPlantFormValues;
  errors: NewPlantFormErrors;
  onChange: (patch: Partial<NewPlantFormValues>) => void;
  nameRequired?: boolean;
}

const difficultyOptions: { value: DifficultyLevel; label: string }[] = [
  { value: "easy", label: "Latwy" },
  { value: "medium", label: "Sredni" },
  { value: "hard", label: "Trudny" },
];

export default function PlantBasicsSection({
  values,
  errors,
  onChange,
  nameRequired = true,
}: PlantBasicsSectionProps) {
  const nameError = errors.fields?.name;
  const soilError = errors.fields?.soil;
  const potError = errors.fields?.pot;
  const positionError = errors.fields?.position;
  const difficultyError = errors.fields?.difficulty;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-neutral-900">Podstawowe dane</h2>
        <p className="text-sm text-neutral-600">Uzupelnij podstawowe informacje o roslinie.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="plant-name">
            Nazwa {nameRequired ? "*" : null}
          </label>
          <Input
            id="plant-name"
            value={values.name}
            onChange={(event) => onChange({ name: event.target.value })}
            maxLength={50}
            placeholder="Monstera deliciosa"
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? "plant-name-error" : undefined}
          />
          {nameError ? (
            <p id="plant-name-error" className="mt-1 text-xs text-red-600" role="alert">
              {nameError}
            </p>
          ) : null}
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="plant-difficulty">
            Poziom trudnosci
          </label>
          <Select
            value={values.difficulty ?? ""}
            onValueChange={(value) => onChange({ difficulty: value as DifficultyLevel })}
          >
            <SelectTrigger id="plant-difficulty" className="w-full" aria-invalid={Boolean(difficultyError)}>
              <SelectValue placeholder="Wybierz" />
            </SelectTrigger>
            <SelectContent>
              {difficultyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {difficultyError ? (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {difficultyError}
            </p>
          ) : null}
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="plant-soil">
            Gleba
          </label>
          <Input
            id="plant-soil"
            value={values.soil ?? ""}
            onChange={(event) => onChange({ soil: event.target.value })}
            maxLength={200}
            placeholder="np. ziemia uniwersalna"
            aria-invalid={Boolean(soilError)}
            aria-describedby={soilError ? "plant-soil-error" : undefined}
          />
          {soilError ? (
            <p id="plant-soil-error" className="mt-1 text-xs text-red-600" role="alert">
              {soilError}
            </p>
          ) : null}
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="plant-pot">
            Doniczka
          </label>
          <Input
            id="plant-pot"
            value={values.pot ?? ""}
            onChange={(event) => onChange({ pot: event.target.value })}
            maxLength={200}
            placeholder="np. ceramiczna, 18 cm"
            aria-invalid={Boolean(potError)}
            aria-describedby={potError ? "plant-pot-error" : undefined}
          />
          {potError ? (
            <p id="plant-pot-error" className="mt-1 text-xs text-red-600" role="alert">
              {potError}
            </p>
          ) : null}
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700" htmlFor="plant-position">
            Stanowisko
          </label>
          <Input
            id="plant-position"
            value={values.position ?? ""}
            onChange={(event) => onChange({ position: event.target.value })}
            maxLength={50}
            placeholder="np. polnocny parapet"
            aria-invalid={Boolean(positionError)}
            aria-describedby={positionError ? "plant-position-error" : undefined}
          />
          {positionError ? (
            <p id="plant-position-error" className="mt-1 text-xs text-red-600" role="alert">
              {positionError}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
