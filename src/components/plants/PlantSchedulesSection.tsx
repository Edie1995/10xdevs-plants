import type { SeasonalScheduleCommand, Season } from "../../types";
import type { NewPlantFormErrors } from "../../lib/plants/new-plant-viewmodel";
import { cn } from "../../lib/utils";
import SeasonScheduleRow from "./SeasonScheduleRow";

interface PlantSchedulesSectionProps {
  schedules?: SeasonalScheduleCommand[];
  errors?: NewPlantFormErrors["schedules"];
  errorMessage?: string;
  onToggleSchedules: (enabled: boolean) => void;
  onUpdateSchedule: (season: Season, patch: Partial<SeasonalScheduleCommand>) => void;
}

const seasonLabels: Record<Season, string> = {
  spring: "Wiosna",
  summer: "Lato",
  autumn: "Jesien",
  winter: "Zima",
};

const seasons: Season[] = ["spring", "summer", "autumn", "winter"];

const getScheduleValue = (schedules: SeasonalScheduleCommand[] | undefined, season: Season) => {
  return (
    schedules?.find((entry) => entry.season === season) ?? {
      season,
      watering_interval: 0,
      fertilizing_interval: 0,
    }
  );
};

export default function PlantSchedulesSection({
  schedules,
  errors,
  errorMessage,
  onToggleSchedules,
  onUpdateSchedule,
}: PlantSchedulesSectionProps) {
  const enabled = Boolean(schedules && schedules.length > 0);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">Harmonogram sezonowy</h2>
          <p className="text-sm text-neutral-600">Opcjonalnie ustaw cykle podlewania i nawozenia.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onToggleSchedules(event.target.checked)}
            className={cn("h-4 w-4 rounded border-neutral-300")}
          />
          Ustaw harmonogram
        </label>
      </div>

      {enabled ? (
        <div className="space-y-3">
          {errorMessage ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {errorMessage}
            </div>
          ) : null}
          {seasons.map((season) => (
            <SeasonScheduleRow
              key={season}
              season={season}
              seasonLabel={seasonLabels[season]}
              value={getScheduleValue(schedules, season)}
              error={errors?.[season]}
              onChange={(patch) => onUpdateSchedule(season, patch)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-500">Wlacz, aby uzupelnic harmonogram.</p>
      )}
    </section>
  );
}
