import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { ApiErrorViewModel } from "../../lib/api/api-client";
import type { CareLogDto } from "../../types";
import { useCareActionsList } from "../hooks/useCareActionsList";
import type { CareActionsFilterVM } from "../../lib/plants/plant-history-viewmodel";
import { mapCareLogToRow } from "../../lib/plants/plant-history-viewmodel";
import { Button } from "../ui/button";

export interface PlantHistoryTabProps {
  plantId: string;
  recentFromDetail: CareLogDto[];
  onApiError: (error: ApiErrorViewModel) => void;
}

const filterOptions: { value: CareActionsFilterVM["actionType"]; label: string }[] = [
  { value: "all", label: "Wszystko" },
  { value: "watering", label: "Podlewanie" },
  { value: "fertilizing", label: "Nawozenie" },
];

export default function PlantHistoryTab({ plantId, recentFromDetail, onApiError }: PlantHistoryTabProps) {
  const [filter, setFilter] = useState<CareActionsFilterVM>({ actionType: "all", limit: 50 });
  const { data, error, isLoading, isEmpty, refetch } = useCareActionsList(plantId, filter);

  const fallbackRows = useMemo(() => recentFromDetail.map(mapCareLogToRow), [recentFromDetail]);

  useEffect(() => {
    if (!error) {
      return;
    }
    onApiError(error);
    if (error.httpStatus && error.httpStatus >= 500) {
      toast.error("Nie udalo sie pobrac historii. Sprobuj ponownie.");
    }
  }, [error, onApiError]);

  const rows = error ? fallbackRows : data;

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Historia pielegnacji</h2>
          <p className="text-sm text-neutral-600">Ostatnie dzialania pielegnacyjne dla rosliny.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={filter.actionType === option.value ? "default" : "outline"}
              onClick={() => setFilter((prev) => ({ ...prev, actionType: option.value }))}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {error && error.httpStatus && error.httpStatus >= 500 ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <div>Nie udalo sie pobrac historii.</div>
          <Button type="button" variant="outline" className="mt-2" onClick={refetch}>
            Sprobuj ponownie
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-6 space-y-3">
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-neutral-200" />
          <div className="h-4 w-1/2 animate-pulse rounded-full bg-neutral-200" />
          <div className="h-4 w-3/4 animate-pulse rounded-full bg-neutral-200" />
        </div>
      ) : null}

      {!isLoading && isEmpty && rows.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-200 px-4 py-6 text-sm text-neutral-600">
          Brak historii. Dodaj podlewanie lub nawozenie z szybkich akcji.
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="mt-6 space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3"
            >
              <div className="text-sm font-medium text-neutral-800">{row.actionTypeLabel}</div>
              <div className="text-sm text-neutral-600">{row.performedAtDisplay}</div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
