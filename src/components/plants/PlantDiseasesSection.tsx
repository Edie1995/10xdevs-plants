import type { DiseaseCommand } from "../../types";
import type { NewPlantFormErrors } from "../../lib/plants/new-plant-viewmodel";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import DiseaseEntryRow from "./DiseaseEntryRow";

interface PlantDiseasesSectionProps {
  diseases?: DiseaseCommand[];
  errors?: NewPlantFormErrors["diseases"];
  onToggleDiseases: (enabled: boolean) => void;
  onAddDisease: () => void;
  onRemoveDisease: (index: number) => void;
  onUpdateDisease: (index: number, patch: Partial<DiseaseCommand>) => void;
}

export default function PlantDiseasesSection({
  diseases,
  errors,
  onToggleDiseases,
  onAddDisease,
  onRemoveDisease,
  onUpdateDisease,
}: PlantDiseasesSectionProps) {
  const enabled = Boolean(diseases);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">Choroby</h2>
          <p className="text-sm text-neutral-600">Opcjonalnie dodaj liste chorob i zalecen.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onToggleDiseases(event.target.checked)}
            className={cn("h-4 w-4 rounded border-neutral-300")}
          />
          Dodaj choroby
        </label>
      </div>

      {enabled ? (
        <div className="space-y-4">
          {diseases && diseases.length > 0 ? (
            diseases.map((disease, index) => (
              <DiseaseEntryRow
                key={`disease-${index}`}
                index={index}
                value={disease}
                error={errors?.[index]}
                onChange={(patch) => onUpdateDisease(index, patch)}
                onRemove={() => onRemoveDisease(index)}
              />
            ))
          ) : (
            <p className="text-sm text-neutral-500">Dodaj pierwsza chorobe, aby uzupelnic dane.</p>
          )}
          <Button type="button" variant="outline" onClick={onAddDisease}>
            Dodaj chorobe
          </Button>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">Wlacz, aby dodac choroby.</p>
      )}
    </section>
  );
}
