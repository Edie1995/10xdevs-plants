import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import type { ApiErrorViewModel } from "../../lib/api/api-client";
import { apiPost } from "../../lib/api/api-client";
import type {
  CareActionCreateCommand,
  CareActionResultDto,
} from "../../types";
import type { PlantScheduleStateVM } from "../../lib/dashboard/dashboard-viewmodel";
import {
  formatUtcDateOnly,
  parseDateOnlyToUtc,
  toUtcDateOnly,
} from "../../lib/services/care-schedule.utils";
import { isFertilizingDisabledForDate } from "../../lib/dashboard/schedule.utils";
import { toast } from "sonner";

type CareActionType = "watering" | "fertilizing";

type BackdateCareActionModalProps = {
  open: boolean;
  actionType: CareActionType;
  plantId: string;
  scheduleState: PlantScheduleStateVM;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
  onError: (error: ApiErrorViewModel) => void;
};

export default function BackdateCareActionModal({
  open,
  actionType,
  plantId,
  scheduleState,
  onOpenChange,
  onSubmitted,
  onError,
}: BackdateCareActionModalProps) {
  const [value, setValue] = useState<string>(() => formatUtcDateOnly(toUtcDateOnly(new Date())));
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setInlineError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  const maxDate = useMemo(() => formatUtcDateOnly(toUtcDateOnly(new Date())), []);

  const scheduleBlocking =
    scheduleState.status === "missing" || scheduleState.status === "incomplete";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = parseDateOnlyToUtc(value);
    if (!parsed) {
      setInlineError("Podaj poprawna date.");
      return;
    }

    if (parsed.getTime() > toUtcDateOnly(new Date()).getTime()) {
      setInlineError("Nie mozna wybrac przyszlej daty.");
      return;
    }

    if (scheduleBlocking) {
      setInlineError("Ustaw harmonogram, aby korzystac z akcji.");
      return;
    }

    if (actionType === "fertilizing" && scheduleState.status === "ready") {
      const disabled = isFertilizingDisabledForDate(scheduleState.schedules, parsed);
      if (disabled) {
        setInlineError("Nawozenie jest wylaczone w tym sezonie.");
        return;
      }
    }

    setInlineError(null);
    setIsSubmitting(true);
    const payload: CareActionCreateCommand = {
      action_type: actionType,
      performed_at: value,
    };
    const result = await apiPost<CareActionResultDto>(
      `/api/plants/${plantId}/care-actions`,
      payload,
    );
    setIsSubmitting(false);

    if (result.error) {
      if (result.error.code === "performed_at_in_future") {
        setInlineError("Nie mozna wybrac przyszlej daty.");
        return;
      }

      if (result.error.code === "fertilizing_disabled") {
        setInlineError("Nawozenie jest wylaczone w tym sezonie.");
        return;
      }

      if (result.error.code === "schedule_missing") {
        setInlineError("Ustaw harmonogram, aby korzystac z akcji.");
        return;
      }

      onError(result.error);
      return;
    }

    onOpenChange(false);
    toast.success("Akcja zostala zapisana.");
    onSubmitted();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {actionType === "watering" ? "Ustaw date podlewania" : "Ustaw date nawozenia"}
          </DialogTitle>
          <DialogDescription>Wybierz date, aby zapisac akcje wstecz.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm text-neutral-700">
            Data
            <input
              type="date"
              value={value}
              max={maxDate}
              className="rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
              onChange={(event) => setValue(event.target.value)}
              required
            />
          </label>
          {inlineError ? <p className="text-sm text-red-600">{inlineError}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Zapisz
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
