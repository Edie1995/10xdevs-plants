import { useState } from "react";

import { toast } from "sonner";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import QuickActions from "./QuickActions";
import type { ApiErrorViewModel } from "../../lib/api/api-client";
import type { PlantScheduleStateVM } from "../../lib/dashboard/dashboard-viewmodel";
import type { PlantHeaderVM } from "../../lib/plants/plant-viewmodel";
import icon1 from "../../assets/icons/1.ico";
import icon2 from "../../assets/icons/2.ico";
import icon3 from "../../assets/icons/3.ico";
import icon4 from "../../assets/icons/4.ico";
import icon6 from "../../assets/icons/6.ico";
import icon8 from "../../assets/icons/8.ico";
import icon9 from "../../assets/icons/9.ico";
import icon10 from "../../assets/icons/10.ico";
import icon11 from "../../assets/icons/11.ico";
import icon12 from "../../assets/icons/12.ico";

export interface PlantHeaderProps {
  plant: PlantHeaderVM;
  scheduleState: PlantScheduleStateVM;
  onLoadSchedule: () => Promise<PlantScheduleStateVM>;
  onCareActionCompleted: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onNavigateToSchedule: () => void;
  onApiError: (error: ApiErrorViewModel) => void;
}

const statusToneClasses: Record<PlantHeaderVM["statusTone"], string> = {
  danger: "bg-red-600 text-white",
  warning: "bg-amber-500 text-white",
  neutral: "bg-neutral-200 text-neutral-800",
};

const iconMap: Record<string, string> = {
  "1": icon1,
  "2": icon2,
  "3": icon3,
  "4": icon4,
  "6": icon6,
  "8": icon8,
  "9": icon9,
  "10": icon10,
  "11": icon11,
  "12": icon12,
};

const getInlineErrorMessage = (error: ApiErrorViewModel) => {
  if (error.code === "fertilizing_disabled") {
    return "Nawozenie jest wylaczone w tym sezonie.";
  }

  if (error.code === "performed_at_in_future") {
    return "Nie mozna zapisac akcji z przyszla data.";
  }

  if (error.httpStatus === 400) {
    return "Nie udalo sie zapisac akcji.";
  }

  return error.message;
};

export default function PlantHeader({
  plant,
  scheduleState,
  onLoadSchedule,
  onCareActionCompleted,
  onEdit,
  onDelete,
  onNavigateToSchedule,
  onApiError,
}: PlantHeaderProps) {
  const [actionError, setActionError] = useState<ApiErrorViewModel | null>(null);
  const iconLabel = plant.iconKey ?? plant.name.charAt(0).toUpperCase();
  const iconSrc = plant.iconKey ? iconMap[plant.iconKey] : undefined;
  const scheduleBlocking = scheduleState.status === "missing" || scheduleState.status === "incomplete";

  const handleError = (error: ApiErrorViewModel) => {
    if (error.code === "schedule_missing") {
      toast("Ustaw harmonogram, aby korzystac z akcji.");
    }

    setActionError(error);
    onApiError(error);
  };

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 text-base font-semibold text-neutral-900"
            style={{ backgroundColor: plant.colorHex ?? "#f5f5f5" }}
            aria-hidden="true"
          >
            {iconSrc ? <img src={iconSrc} alt="" className="h-8 w-8" /> : iconLabel}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-neutral-900">{plant.name}</h1>
              <Badge className={statusToneClasses[plant.statusTone]}>{plant.statusLabel}</Badge>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-neutral-600 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-6">
                <span>Podlewanie</span>
                <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-800">
                  {plant.nextWateringDisplay}
                </span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span>Nawozenie</span>
                <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-800">
                  {plant.nextFertilizingDisplay}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={onEdit}>
            Edytuj
          </Button>
          <Button type="button" variant="destructive" onClick={onDelete}>
            Usun
          </Button>
        </div>
      </div>

      {scheduleBlocking ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Ustaw harmonogram, aby korzystac z akcji pielegnacyjnych.
          <div className="mt-2">
            <Button type="button" variant="outline" onClick={onNavigateToSchedule}>
              Ustaw harmonogram
            </Button>
          </div>
        </div>
      ) : null}

      {actionError && !scheduleBlocking ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {getInlineErrorMessage(actionError)}
        </div>
      ) : null}

      <QuickActions
        plantId={plant.id}
        scheduleState={scheduleState}
        onLoadSchedule={onLoadSchedule}
        onSuccess={() => {
          setActionError(null);
          onCareActionCompleted();
        }}
        onError={handleError}
      />
    </section>
  );
}
