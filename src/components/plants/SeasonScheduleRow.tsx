import type { ChangeEvent } from "react";

import type { SeasonalScheduleCommand, Season } from "../../types";
import { Input } from "../ui/input";

interface SeasonScheduleRowProps {
  season: Season;
  seasonLabel: string;
  value: SeasonalScheduleCommand;
  error?: { watering_interval?: string; fertilizing_interval?: string };
  onChange: (patch: Partial<SeasonalScheduleCommand>) => void;
}

const sanitizeNumberInput = (value: string) => value.replace(/[^\d]/g, "");

export default function SeasonScheduleRow({ season, seasonLabel, value, error, onChange }: SeasonScheduleRowProps) {
  const handleNumberChange =
    (key: "watering_interval" | "fertilizing_interval") => (event: ChangeEvent<HTMLInputElement>) => {
      const sanitized = sanitizeNumberInput(event.target.value);
      const nextValue = sanitized === "" ? 0 : Number(sanitized);
      onChange({ season, [key]: nextValue });
    };

  return (
    <div
      className="grid gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 md:grid-cols-[140px_1fr_1fr] md:items-center"
      data-test-id={`new-plant-schedule-row-${season}`}
    >
      <div className="text-sm font-medium text-neutral-700">{seasonLabel}</div>
      <div>
        <label className="text-xs text-neutral-500" htmlFor={`watering-${season}`}>
          Podlewanie (dni)
        </label>
        <Input
          id={`watering-${season}`}
          data-test-id={`new-plant-schedule-${season}-watering`}
          inputMode="numeric"
          pattern="[0-9]*"
          value={String(value.watering_interval ?? 0)}
          onChange={handleNumberChange("watering_interval")}
          aria-invalid={Boolean(error?.watering_interval)}
          aria-describedby={error?.watering_interval ? `watering-${season}-error` : undefined}
        />
        {error?.watering_interval ? (
          <p id={`watering-${season}-error`} className="mt-1 text-xs text-red-600" role="alert">
            {error.watering_interval}
          </p>
        ) : null}
      </div>
      <div>
        <label className="text-xs text-neutral-500" htmlFor={`fertilizing-${season}`}>
          Nawozenie (dni)
        </label>
        <Input
          id={`fertilizing-${season}`}
          data-test-id={`new-plant-schedule-${season}-fertilizing`}
          inputMode="numeric"
          pattern="[0-9]*"
          value={String(value.fertilizing_interval ?? 0)}
          onChange={handleNumberChange("fertilizing_interval")}
          aria-invalid={Boolean(error?.fertilizing_interval)}
          aria-describedby={error?.fertilizing_interval ? `fertilizing-${season}-error` : `fertilizing-${season}-help`}
        />
        {error?.fertilizing_interval ? (
          <p id={`fertilizing-${season}-error`} className="mt-1 text-xs text-red-600" role="alert">
            {error.fertilizing_interval}
          </p>
        ) : null}
        <p id={`fertilizing-${season}-help`} className="mt-1 text-xs text-neutral-500">
          0 wylacza nawozenie.
        </p>
      </div>
    </div>
  );
}
