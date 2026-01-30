import type { CareActionType, CareLogDto } from "../../types";
import { formatDisplayDate } from "../date/format";

export type CareActionsFilterVM = {
  actionType: "all" | CareActionType;
  limit: number;
};

export type CareActionRowVM = {
  id: string;
  actionTypeLabel: "Podlewanie" | "Nawozenie";
  performedAtDisplay: string;
};

export const mapCareLogToRow = (entry: CareLogDto): CareActionRowVM => ({
  id: entry.id,
  actionTypeLabel: entry.action_type === "watering" ? "Podlewanie" : "Nawozenie",
  performedAtDisplay: formatDisplayDate(entry.performed_at),
});
