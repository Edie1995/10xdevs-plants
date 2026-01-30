import type { SeasonalScheduleDto } from "../../types";
import type { ApiErrorViewModel } from "../api/api-client";
import { formatDisplayDate } from "../date/format";

export type DashboardQueryState = {
  page: number;
  limit: number;
  search?: string;
  sort: "priority" | "name" | "created";
  direction: "asc" | "desc";
};

export const DASHBOARD_QUERY_DEFAULTS: DashboardQueryState = {
  page: 1,
  limit: 20,
  sort: "priority",
  direction: "asc",
};

export type DashboardStatsVM = {
  totalPlants: number;
  urgent: number;
  warning: number;
};

export type PaginationVM = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PlantCardVM = {
  id: string;
  name: string;
  iconKey: string | null;
  colorHex: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  statusPriority: 0 | 1 | 2;
  statusLabel: "Pilne" | "Na dziś" | "OK";
  statusTone: "danger" | "warning" | "neutral";
  nextWateringAt?: string | null;
  nextFertilizingAt?: string | null;
  nextWateringDisplay: string;
  nextFertilizingDisplay: string;
  dueDatesTone: {
    watering: "overdue" | "today" | "future" | "none";
    fertilizing: "overdue" | "today" | "future" | "none";
  };
  links: {
    detailsHref: string;
    scheduleHref: string;
  };
};

export type DashboardViewModel = {
  requiresAttention: PlantCardVM[];
  allPlants: PlantCardVM[];
  stats: DashboardStatsVM;
  pagination: PaginationVM;
  query: DashboardQueryState;
};

export type PlantScheduleStateVM = {
  status: "unknown" | "loading" | "ready" | "missing" | "incomplete" | "error";
  schedules?: SeasonalScheduleDto[];
  lastCheckedAt?: number;
  error?: ApiErrorViewModel;
};

const toDateKey = (value: Date) =>
  value.getUTCFullYear() * 10000 + (value.getUTCMonth() + 1) * 100 + value.getUTCDate();

const getDueTone = (value?: string | null) => {
  if (!value) {
    return "none";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "none";
  }

  const todayKey = toDateKey(new Date());
  const dateKey = toDateKey(date);

  if (dateKey < todayKey) {
    return "overdue";
  }

  if (dateKey === todayKey) {
    return "today";
  }

  return "future";
};

const mapStatus = (priority: number) => {
  if (priority >= 2) {
    return { label: "Pilne", tone: "danger" as const };
  }

  if (priority === 1) {
    return { label: "Na dziś", tone: "warning" as const };
  }

  return { label: "OK", tone: "neutral" as const };
};

export const mapPlantCardDto = (item: {
  id: string;
  name: string;
  icon_key: string | null;
  color_hex: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  status_priority: number;
  next_watering_at?: string | null;
  next_fertilizing_at?: string | null;
}): PlantCardVM => {
  const status = mapStatus(item.status_priority);

  return {
    id: item.id,
    name: item.name,
    iconKey: item.icon_key,
    colorHex: item.color_hex,
    difficulty: item.difficulty,
    statusPriority: (item.status_priority >= 2 ? 2 : item.status_priority <= 0 ? 0 : 1) as 0 | 1 | 2,
    statusLabel: status.label,
    statusTone: status.tone,
    nextWateringAt: item.next_watering_at,
    nextFertilizingAt: item.next_fertilizing_at,
    nextWateringDisplay: formatDisplayDate(item.next_watering_at),
    nextFertilizingDisplay: formatDisplayDate(item.next_fertilizing_at),
    dueDatesTone: {
      watering: getDueTone(item.next_watering_at),
      fertilizing: getDueTone(item.next_fertilizing_at),
    },
    links: {
      detailsHref: `/app/plants/${item.id}`,
      scheduleHref: `/app/plants/${item.id}?tab=schedule`,
    },
  };
};

export const buildDashboardViewModel = (
  data: {
    requires_attention: Array<Parameters<typeof mapPlantCardDto>[0]>;
    all_plants: Array<Parameters<typeof mapPlantCardDto>[0]>;
    stats: { total_plants: number; urgent: number; warning: number };
  },
  pagination: PaginationVM,
  query: DashboardQueryState
): DashboardViewModel => ({
  requiresAttention: data.requires_attention.map(mapPlantCardDto),
  allPlants: data.all_plants.map(mapPlantCardDto),
  stats: {
    totalPlants: data.stats.total_plants,
    urgent: data.stats.urgent,
    warning: data.stats.warning,
  },
  pagination,
  query,
});
