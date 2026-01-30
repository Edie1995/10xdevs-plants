import type { SeasonalScheduleDto } from "../../types";
import { getSeasonForDate, toUtcDateOnly } from "../services/care-schedule.utils";

export const isFertilizingDisabledForDate = (
  schedules: SeasonalScheduleDto[] | undefined,
  date: Date,
) => {
  if (!schedules || schedules.length === 0) {
    return false;
  }

  const season = getSeasonForDate(toUtcDateOnly(date));
  const schedule = schedules.find((item) => item.season === season);

  if (!schedule) {
    return true;
  }

  return schedule.fertilizing_interval === 0;
};
