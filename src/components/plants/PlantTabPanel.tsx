import type { PlantCardDetailDto, PlantTabKey } from "../../types";
import type { ApiErrorViewModel } from "../../lib/api/api-client";
import type { PlantScheduleStateVM } from "../../lib/dashboard/dashboard-viewmodel";
import PlantBasicTab from "./PlantBasicTab";
import PlantDiseasesTab from "./PlantDiseasesTab";
import PlantHistoryTab from "./PlantHistoryTab";
import PlantScheduleTab from "./PlantScheduleTab";

export interface PlantTabPanelProps {
  activeTab: PlantTabKey;
  plantId: string;
  plantDetail: PlantCardDetailDto | null;
  isLoading: boolean;
  onPlantUpdated: () => void;
  onApiError: (error: ApiErrorViewModel) => void;
  scheduleState: PlantScheduleStateVM;
  loadSchedule: () => Promise<PlantScheduleStateVM>;
  setScheduleState: (next: PlantScheduleStateVM) => void;
  basicEditMode: boolean;
  setBasicEditMode: (next: boolean) => void;
}

const LoadingPlaceholder = () => (
  <section className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
    <div className="space-y-3">
      <div className="h-4 w-2/3 animate-pulse rounded-full bg-neutral-200" />
      <div className="h-4 w-1/2 animate-pulse rounded-full bg-neutral-200" />
      <div className="h-4 w-3/4 animate-pulse rounded-full bg-neutral-200" />
    </div>
  </section>
);

export default function PlantTabPanel({
  activeTab,
  plantId,
  plantDetail,
  isLoading,
  onPlantUpdated,
  onApiError,
  scheduleState,
  loadSchedule,
  setScheduleState,
  basicEditMode,
  setBasicEditMode,
}: PlantTabPanelProps) {
  if (isLoading && !plantDetail) {
    return <LoadingPlaceholder />;
  }

  if (!plantDetail) {
    return null;
  }

  switch (activeTab) {
    case "basic":
      return (
        <PlantBasicTab
          plantId={plantId}
          plantDetail={plantDetail}
          editMode={basicEditMode}
          onEditModeChange={setBasicEditMode}
          onSaved={onPlantUpdated}
          onApiError={onApiError}
        />
      );
    case "schedule":
      return (
        <PlantScheduleTab
          plantId={plantId}
          scheduleState={scheduleState}
          loadSchedule={loadSchedule}
          setScheduleState={setScheduleState}
          onSaved={onPlantUpdated}
          onApiError={onApiError}
        />
      );
    case "diseases":
      return (
        <PlantDiseasesTab
          plantId={plantId}
          initialDiseases={plantDetail.diseases ?? []}
          onApiError={onApiError}
        />
      );
    case "history":
      return (
        <PlantHistoryTab
          plantId={plantId}
          recentFromDetail={plantDetail.recent_care_logs ?? []}
          onApiError={onApiError}
        />
      );
    default:
      return null;
  }
}
