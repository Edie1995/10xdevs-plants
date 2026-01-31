import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

import type { PlantCardVM, PlantScheduleStateVM } from "../../lib/dashboard/dashboard-viewmodel";
import type { ApiErrorViewModel } from "../../lib/api/api-client";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import QuickActions from "./QuickActions";
import { usePlantSchedulesCache } from "../hooks/usePlantSchedulesCache";
import { toast } from "sonner";
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

interface PlantCardProps {
  plant: PlantCardVM;
  variant?: "dashboard" | "list";
  onCareActionCompleted?: () => void;
  onNavigateToSchedule?: (plantId: string) => void;
  onRequestDelete?: (plant: PlantCardVM) => void;
  onRequestEdit?: (plant: PlantCardVM) => void;
}

const statusToneClasses: Record<PlantCardVM["statusTone"], string> = {
  danger: "bg-red-600 text-white",
  warning: "bg-amber-500 text-white",
  neutral: "bg-neutral-200 text-neutral-800",
};

const dueToneClasses: Record<PlantCardVM["dueDatesTone"]["watering"], string> = {
  overdue: "text-red-700 bg-red-50",
  today: "text-amber-700 bg-amber-50",
  future: "text-neutral-800",
  none: "text-neutral-800",
};

export const getInlineErrorMessage = (error: ApiErrorViewModel) => {
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

export const handlePlantCardError = ({
  error,
  scheduleState,
  plantId,
  setActionError,
  setState,
  onCareActionCompleted,
  toastError,
}: {
  error: ApiErrorViewModel;
  scheduleState: PlantScheduleStateVM;
  plantId: string;
  setActionError: (error: ApiErrorViewModel | null) => void;
  setState: (plantId: string, next: PlantScheduleStateVM) => void;
  onCareActionCompleted?: () => void;
  toastError: (message: string) => void;
}) => {
  if (error.httpStatus === 401) {
    const redirectTo = encodeURIComponent(window.location.href);
    window.location.href = `/auth/login?redirectTo=${redirectTo}`;
    return;
  }

  if (error.httpStatus === 404 || error.code === "not_found") {
    setActionError({
      ...error,
      message: "Nie znaleziono rosliny. Odswiezam liste.",
    });
    onCareActionCompleted?.();
    toastError("Nie znaleziono rosliny. Lista zostanie odswiezona.");
    return;
  }

  if (error.httpStatus && error.httpStatus >= 500) {
    toastError("Cos poszlo nie tak. Sprobuj ponownie.");
  }

  setActionError(error);

  if (error.code === "schedule_missing" || error.code === "schedule_incomplete") {
    const nextState: PlantScheduleStateVM = {
      status: "missing",
      error,
      lastCheckedAt: Date.now(),
    };
    setState(plantId, nextState);
  }

  if (error.code === "fertilizing_disabled") {
    setState(plantId, {
      ...scheduleState,
      error,
      lastCheckedAt: Date.now(),
    });
  }
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

export default function PlantCard({
  plant,
  variant = "dashboard",
  onCareActionCompleted,
  onNavigateToSchedule,
  onRequestDelete,
  onRequestEdit,
}: PlantCardProps) {
  const { getState, getOrLoad, setState } = usePlantSchedulesCache();
  const scheduleState = getState(plant.id);
  const [actionError, setActionError] = useState<ApiErrorViewModel | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const iconLabel = plant.iconKey ?? plant.name.charAt(0).toUpperCase();
  const iconSrc = plant.iconKey ? iconMap[plant.iconKey] : undefined;

  const handleError = (error: ApiErrorViewModel) =>
    handlePlantCardError({
      error,
      scheduleState,
      plantId: plant.id,
      setActionError,
      setState,
      onCareActionCompleted,
      toastError: toast.error,
    });

  const scheduleBlocking = scheduleState.status === "missing" || scheduleState.status === "incomplete";

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current || menuRef.current.contains(event.target as Node)) {
        return;
      }

      setIsMenuOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <Card data-test-id={`plant-card-${plant.id}`}>
      <CardHeader className="gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 text-lg font-semibold text-neutral-900"
              style={{ backgroundColor: plant.colorHex ?? "#f5f5f5" }}
              aria-hidden="true"
            >
              {iconSrc ? <img src={iconSrc} alt="" className="h-10 w-10" /> : iconLabel}
            </div>
            <div>
              <CardTitle className="text-lg" data-test-id={`plant-name-${plant.id}`}>
                {plant.name}
              </CardTitle>
              {plant.statusPriority !== 2 ? (
                <div className="mt-2">
                  <Badge
                    className={statusToneClasses[plant.statusTone]}
                    data-test-id={`plant-status-badge-${plant.id}`}
                  >
                    {plant.statusLabel}
                  </Badge>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <a href={plant.links.detailsHref} className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
              Szczegoly
            </a>
            {variant === "list" ? (
              <div className="relative" ref={menuRef}>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Menu akcji rosliny"
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                  onClick={() => setIsMenuOpen((prev) => !prev)}
                >
                  <MoreVertical />
                </Button>
                {isMenuOpen ? (
                  <div
                    className="absolute right-0 z-10 mt-2 w-40 rounded-md border border-neutral-200 bg-white p-1 shadow-md"
                    role="menu"
                  >
                    <button
                      type="button"
                      className="w-full rounded-sm px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
                      role="menuitem"
                      onClick={() => {
                        setIsMenuOpen(false);
                        if (onRequestEdit) {
                          onRequestEdit(plant);
                        } else {
                          window.location.href = `/app/plants/${plant.id}?tab=basic&edit=1`;
                        }
                      }}
                    >
                      Edytuj
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-sm px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                      role="menuitem"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onRequestDelete?.(plant);
                      }}
                    >
                      Usun
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm text-neutral-600" data-test-id={`plant-schedule-${plant.id}`}>
          <div className="flex items-center justify-between">
            <span>Podlewanie</span>
            <span
              className={`rounded-md px-2 py-1 text-xs font-medium ${dueToneClasses[plant.dueDatesTone.watering]}`}
              data-test-id={`plant-next-watering-${plant.id}`}
            >
              {plant.nextWateringDisplay}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Nawozenie</span>
            <span
              className={`rounded-md px-2 py-1 text-xs font-medium ${dueToneClasses[plant.dueDatesTone.fertilizing]}`}
              data-test-id={`plant-next-fertilizing-${plant.id}`}
            >
              {plant.nextFertilizingDisplay}
            </span>
          </div>
        </div>
        {scheduleBlocking ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Ustaw harmonogram, aby korzystac z akcji pielegnacyjnych.
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  onNavigateToSchedule
                    ? onNavigateToSchedule(plant.id)
                    : (window.location.href = plant.links.scheduleHref)
                }
              >
                Ustaw harmonogram
              </Button>
            </div>
          </div>
        ) : null}

        {actionError && !scheduleBlocking ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {getInlineErrorMessage(actionError)}
          </div>
        ) : null}

        <QuickActions
          plantId={plant.id}
          scheduleState={scheduleState}
          onLoadSchedule={() => getOrLoad(plant.id)}
          onSuccess={() => {
            setActionError(null);
            onCareActionCompleted?.();
          }}
          onError={handleError}
        />
      </CardContent>
    </Card>
  );
}
