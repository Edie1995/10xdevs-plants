import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import EmptyState from "../common/EmptyState";
import PlantTabs from "./PlantTabs";
import PlantHeader from "./PlantHeader";
import PlantBackLink from "./PlantBackLink";
import PlantTabPanel from "./PlantTabPanel";
import ConfirmDeletePlantDialog from "./ConfirmDeletePlantDialog";
import { usePlantDetailData } from "../hooks/usePlantDetailData";
import { usePlantTabState } from "../hooks/usePlantTabState";
import { usePlantSchedulesCache } from "../hooks/usePlantSchedulesCache";
import type { PlantTabKey } from "../../types";
import { mapPlantDetailToHeader } from "../../lib/plants/plant-viewmodel";
import type { ApiErrorViewModel } from "../../lib/api/api-client";

export interface PlantViewProps {
  plantId: string;
  initialUrl: string;
  initialTab?: PlantTabKey;
  initialEditMode?: boolean;
  returnTo?: string | null;
}

export default function PlantView({ plantId, initialUrl, initialTab, initialEditMode, returnTo }: PlantViewProps) {
  const { tab, setTab } = usePlantTabState(initialTab ?? "basic");
  const { data, error, isLoading, authRequired, notFound, refetch } = usePlantDetailData(plantId);
  const { getState, getOrLoad, setState } = usePlantSchedulesCache();
  const scheduleState = getState(plantId);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [basicEditMode, setBasicEditMode] = useState(Boolean(initialEditMode));

  useEffect(() => {
    if (!initialEditMode) {
      return;
    }

    setTab("basic");
    setBasicEditMode(true);
  }, [initialEditMode, setTab]);

  useEffect(() => {
    if (!authRequired) {
      return;
    }

    const redirectTo = encodeURIComponent(initialUrl);
    window.location.href = `/auth/login?redirectTo=${redirectTo}`;
  }, [authRequired, initialUrl]);

  const tabs = useMemo(
    () => [
      { key: "basic" as const, label: "Podstawowe" },
      { key: "schedule" as const, label: "Harmonogram" },
      { key: "diseases" as const, label: "Choroby" },
      { key: "history" as const, label: "Historia" },
    ],
    []
  );

  const headerVm = useMemo(() => (data ? mapPlantDetailToHeader(data) : null), [data]);
  const safeReturnTo = useMemo(() => {
    if (!returnTo) {
      return "/app/plants";
    }

    if (returnTo.startsWith("/app/plants")) {
      return returnTo;
    }

    if (typeof window === "undefined") {
      return "/app/plants";
    }

    try {
      const target = new URL(returnTo, window.location.origin);
      if (target.origin === window.location.origin && target.pathname.startsWith("/app/plants")) {
        return target.pathname + target.search + target.hash;
      }
    } catch {
      return "/app/plants";
    }

    return "/app/plants";
  }, [returnTo]);

  const handleApiError = useCallback(
    (error: ApiErrorViewModel) => {
      if (error.httpStatus === 401) {
        const redirectTo = encodeURIComponent(initialUrl);
        window.location.href = `/auth/login?redirectTo=${redirectTo}`;
        return;
      }

      if (error.httpStatus === 404 || error.code === "plant_not_found") {
        toast.error("Nie znaleziono rosliny. Odswiezam dane.");
        refetch();
        return;
      }

      if (error.httpStatus && error.httpStatus >= 500) {
        toast.error("Cos poszlo nie tak. Sprobuj ponownie.");
      }

      if (error.code === "schedule_missing" || error.code === "schedule_incomplete") {
        setState(plantId, {
          status: "missing",
          error,
          lastCheckedAt: Date.now(),
        });
      }

      if (error.code === "fertilizing_disabled") {
        setState(plantId, {
          ...scheduleState,
          error,
          lastCheckedAt: Date.now(),
        });
      }
    },
    [initialUrl, plantId, refetch, scheduleState, setState]
  );

  if (notFound) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <EmptyState
          title="Nie znaleziono rosliny."
          description="Nie mamy dostepu do tych danych lub roslina nie istnieje."
          primaryAction={{ label: "Wroc do listy", href: "/app/plants" }}
        />
      </main>
    );
  }

  if (error && typeof error.httpStatus === "number" && error.httpStatus >= 500) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <section className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-base font-semibold text-red-800">Cos poszlo nie tak.</h2>
          <p className="mt-2 text-sm text-red-700">Nie udalo sie pobrac danych. Sprobuj ponownie.</p>
          <button
            type="button"
            className="mt-4 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white"
            onClick={refetch}
          >
            Sprobuj ponownie
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <PlantBackLink returnTo={returnTo} />

      {headerVm ? (
        <div className="mt-4">
          <PlantHeader
            plant={headerVm}
            scheduleState={scheduleState}
            onLoadSchedule={() => getOrLoad(plantId)}
            onCareActionCompleted={refetch}
            onEdit={() => {
              setTab("basic");
              setBasicEditMode(true);
            }}
            onDelete={() => setDeleteDialogOpen(true)}
            onNavigateToSchedule={() => setTab("schedule")}
            onApiError={handleApiError}
          />
        </div>
      ) : (
        <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 animate-pulse rounded-full bg-neutral-200" />
            <div className="flex-1 space-y-3">
              <div className="h-5 w-1/3 animate-pulse rounded-full bg-neutral-200" />
              <div className="h-4 w-1/2 animate-pulse rounded-full bg-neutral-200" />
            </div>
          </div>
        </section>
      )}

      <PlantTabs activeTab={tab} onTabChange={setTab} tabs={tabs} />

      <div className="mt-6">
        <PlantTabPanel
          activeTab={tab}
          plantId={plantId}
          plantDetail={data ?? null}
          isLoading={isLoading}
          onPlantUpdated={refetch}
          onApiError={handleApiError}
          scheduleState={scheduleState}
          loadSchedule={() => getOrLoad(plantId)}
          setScheduleState={(next) => setState(plantId, next)}
          basicEditMode={basicEditMode}
          setBasicEditMode={setBasicEditMode}
        />
      </div>

      <ConfirmDeletePlantDialog
        open={deleteDialogOpen}
        plant={headerVm ? { id: headerVm.id, name: headerVm.name } : null}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={() => {
          window.location.href = safeReturnTo;
        }}
        onError={handleApiError}
      />
    </main>
  );
}
