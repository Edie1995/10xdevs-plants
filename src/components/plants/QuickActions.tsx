import { useRef, useState } from "react";

import { Button } from "../ui/button";
import BackdateCareActionModal from "./BackdateCareActionModal.tsx";
import type { PlantScheduleStateVM } from "../../lib/dashboard/dashboard-viewmodel";
import type { ApiErrorViewModel } from "../../lib/api/api-client";
import { apiPost } from "../../lib/api/api-client";
import type { CareActionCreateCommand } from "../../types";
import { isFertilizingDisabledForDate } from "../../lib/dashboard/schedule.utils";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

type CareActionType = "watering" | "fertilizing";

interface QuickActionsProps {
  plantId: string;
  scheduleState: PlantScheduleStateVM;
  onLoadSchedule: () => Promise<PlantScheduleStateVM>;
  onSuccess: () => void;
  onError: (error: ApiErrorViewModel) => void;
}

const buildError = (code: string, message: string): ApiErrorViewModel => ({
  code,
  message,
});

export default function QuickActions({
  plantId,
  scheduleState,
  onLoadSchedule,
  onSuccess,
  onError,
}: QuickActionsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<CareActionType>("watering");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const holdTimeouts = useRef<Record<CareActionType, number | null>>({
    watering: null,
    fertilizing: null,
  });
  const holdTriggered = useRef<Record<CareActionType, boolean>>({
    watering: false,
    fertilizing: false,
  });
  const isLoadingSchedule = scheduleState.status === "loading";
  const scheduleBlocking = scheduleState.status === "missing" || scheduleState.status === "incomplete";
  const fertilizingDisabled =
    scheduleState.status === "ready" && isFertilizingDisabledForDate(scheduleState.schedules, new Date());
  const disableAll = isSubmitting || isLoadingSchedule || scheduleBlocking;

  const ensureScheduleReady = async () => {
    if (scheduleState.status === "unknown") {
      return onLoadSchedule();
    }

    return scheduleState;
  };

  const isScheduleBlocking = (state: PlantScheduleStateVM) =>
    state.status === "missing" || state.status === "incomplete";

  const handleAction = async (actionType: CareActionType) => {
    const state = await ensureScheduleReady();

    if (isScheduleBlocking(state)) {
      onError(buildError("schedule_missing", "Ustaw harmonogram, aby korzystac z akcji."));
      return;
    }

    if (actionType === "fertilizing" && state.status === "ready") {
      const disabled = isFertilizingDisabledForDate(state.schedules, new Date());
      if (disabled) {
        onError(buildError("fertilizing_disabled", "Nawozenie jest wylaczone w tym sezonie."));
        return;
      }
    }

    setIsSubmitting(true);
    const payload: CareActionCreateCommand = {
      action_type: actionType,
    };
    const result = await apiPost(`/api/plants/${plantId}/care-actions`, payload);
    setIsSubmitting(false);

    if (result.error) {
      onError(result.error);
      return;
    }

    toast.success("Akcja zostala zapisana.");
    onSuccess();
  };

  const handleOpenModal = async (actionType: CareActionType) => {
    setModalAction(actionType);
    setModalOpen(true);
    await ensureScheduleReady();
  };

  const startHold = (actionType: CareActionType) => {
    if (disableAll || (actionType === "fertilizing" && fertilizingDisabled)) {
      return;
    }

    holdTriggered.current[actionType] = false;
    if (holdTimeouts.current[actionType]) {
      window.clearTimeout(holdTimeouts.current[actionType] ?? undefined);
    }

    holdTimeouts.current[actionType] = window.setTimeout(() => {
      holdTriggered.current[actionType] = true;
      handleOpenModal(actionType);
    }, 500);
  };

  const endHold = (actionType: CareActionType) => {
    const timeout = holdTimeouts.current[actionType];
    if (timeout) {
      window.clearTimeout(timeout);
      holdTimeouts.current[actionType] = null;
    }

    if (holdTriggered.current[actionType]) {
      return;
    }

    handleAction(actionType);
  };

  const cancelHold = (actionType: CareActionType) => {
    const timeout = holdTimeouts.current[actionType];
    if (timeout) {
      window.clearTimeout(timeout);
      holdTimeouts.current[actionType] = null;
    }
  };

  return (
    <div className="mt-4 space-y-2" data-test-id={`plant-quick-actions-${plantId}`}>
      <div className="flex flex-wrap gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              disabled={disableAll}
              onPointerDown={() => startHold("watering")}
              onPointerUp={() => endHold("watering")}
              onPointerLeave={() => cancelHold("watering")}
              onPointerCancel={() => cancelHold("watering")}
              data-test-id={`plant-action-water-${plantId}`}
            >
              Podlano dzis
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>Kliknij, aby zapisac dzis. Przytrzymaj, aby wybrac date.</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="inline-flex"
              onPointerEnter={() => {
                if (scheduleState.status === "unknown") {
                  ensureScheduleReady();
                }
              }}
            >
              <Button
                type="button"
                disabled={disableAll || fertilizingDisabled}
                onPointerDown={() => startHold("fertilizing")}
                onPointerUp={() => endHold("fertilizing")}
                onPointerLeave={() => cancelHold("fertilizing")}
                onPointerCancel={() => cancelHold("fertilizing")}
                className={fertilizingDisabled ? "pointer-events-none" : undefined}
                data-test-id={`plant-action-fertilize-${plantId}`}
              >
                Nawozono dzis
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>
            {fertilizingDisabled
              ? "Nawozenie jest wylaczone w tym sezonie."
              : "Kliknij, aby zapisac dzis. Przytrzymaj, aby wybrac date."}
          </TooltipContent>
        </Tooltip>
      </div>

      <BackdateCareActionModal
        open={modalOpen}
        actionType={modalAction}
        plantId={plantId}
        scheduleState={scheduleState}
        onOpenChange={setModalOpen}
        onSubmitted={onSuccess}
        onError={onError}
        dataTestIdPrefix={`plant-backdate-${plantId}`}
      />
    </div>
  );
}
