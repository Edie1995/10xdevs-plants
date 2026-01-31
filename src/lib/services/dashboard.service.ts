import type { SupabaseClient } from "../../db/supabase.client.ts";
import type {
  DashboardDto,
  DashboardQueryDto,
  DashboardStatsDto,
  PaginationDto,
  PlantCardListItemDto,
} from "../../types.ts";
import { computeStatusPriority } from "./care-schedule.utils.ts";

const PLANT_CARD_COLUMNS = [
  "id",
  "name",
  "icon_key",
  "color_hex",
  "difficulty",
  "next_watering_at",
  "next_fertilizing_at",
  "last_watered_at",
  "last_fertilized_at",
  "created_at",
  "updated_at",
].join(", ");

const getEndOfTodayUtcIso = (): string => {
  const now = new Date();
  const endOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  return endOfTodayUtc.toISOString();
};

interface FilterQuery<T> {
  eq: (column: string, value: string) => T;
  ilike: (column: string, pattern: string) => T;
}

const applyBaseFilters = <T extends FilterQuery<T>>(query: T, userId: string, search?: string): T => {
  let filtered = query.eq("user_id", userId);

  if (search) {
    filtered = filtered.ilike("name", `%${search}%`);
  }

  return filtered;
};

const getSortedColumn = (sort?: DashboardQueryDto["sort"]) => {
  if (sort === "created") return "created_at";
  if (sort === "name") return "name";
  return "priority";
};

const getStatusPriority = (item: Pick<PlantCardListItemDto, "next_watering_at" | "next_fertilizing_at">) =>
  computeStatusPriority(item.next_watering_at ?? null, item.next_fertilizing_at ?? null);

const sortByPriority = (items: PlantCardListItemDto[], direction: "asc" | "desc" = "asc"): PlantCardListItemDto[] => {
  const sorted = [...items].sort((left, right) => {
    const leftPriority = getStatusPriority(left);
    const rightPriority = getStatusPriority(right);

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.name.localeCompare(right.name, "pl");
  });

  return direction === "desc" ? sorted.reverse() : sorted;
};

/**
 * Builds the dashboard payload: attention list, paginated list, and stats.
 */
export const getDashboard = async (
  supabase: SupabaseClient,
  userId: string,
  query: DashboardQueryDto
): Promise<{ dashboard: DashboardDto; pagination: PaginationDto }> => {
  const { page = 1, limit = 20, search, sort = "priority", direction = "asc" } = query;
  const offset = (page - 1) * limit;
  const sortColumn = getSortedColumn(sort);

  let listQuery = supabase.from("plant_card").select(PLANT_CARD_COLUMNS, { count: "exact" });

  listQuery = applyBaseFilters(listQuery, userId, search);
  let allPlants: PlantCardListItemDto[] = [];
  let total = 0;

  if (sortColumn === "priority") {
    const { data, error, count } = await listQuery;

    if (error) {
      throw error;
    }

    const items = (data ?? []) as unknown as PlantCardListItemDto[];
    total = count ?? items.length;
    allPlants = sortByPriority(items, direction).slice(offset, offset + limit);
  } else {
    listQuery = listQuery.order(sortColumn, { ascending: direction === "asc" });

    if (sortColumn !== "name") {
      listQuery = listQuery.order("name", { ascending: true });
    }

    listQuery = listQuery.range(offset, offset + limit - 1);

    const { data, error, count } = await listQuery;

    if (error) {
      throw error;
    }

    allPlants = (data ?? []) as unknown as PlantCardListItemDto[];
    total = count ?? 0;
  }
  const totalPages = Math.ceil(total / limit);
  const attentionLimit = Math.min(20, limit);
  const todayEndUtcIso = getEndOfTodayUtcIso();

  let attentionQuery = supabase.from("plant_card").select(PLANT_CARD_COLUMNS);
  attentionQuery = applyBaseFilters(attentionQuery, userId, search);
  attentionQuery = attentionQuery.or(
    `next_watering_at.lte.${todayEndUtcIso},next_fertilizing_at.lte.${todayEndUtcIso}`
  );
  const { data: attentionRows, error: attentionError } = await attentionQuery;

  if (attentionError) {
    throw attentionError;
  }

  const requiresAttention = sortByPriority((attentionRows ?? []) as unknown as PlantCardListItemDto[]).slice(
    0,
    attentionLimit
  );

  const { data: statsRows, error: statsError } = await applyBaseFilters(
    supabase.from("plant_card").select("next_watering_at, next_fertilizing_at"),
    userId,
    search
  );

  if (statsError) {
    throw statsError;
  }

  const { urgentCount, warningCount } = (statsRows ?? []).reduce(
    (acc, item) => {
      const priority = computeStatusPriority(item.next_watering_at ?? null, item.next_fertilizing_at ?? null);
      if (priority === 0) acc.urgentCount += 1;
      if (priority === 1) acc.warningCount += 1;
      return acc;
    },
    { urgentCount: 0, warningCount: 0 }
  );

  const stats: DashboardStatsDto = {
    total_plants: total,
    urgent: urgentCount,
    warning: warningCount,
  };

  return {
    dashboard: {
      requires_attention: requiresAttention,
      all_plants: allPlants,
      stats,
    },
    pagination: {
      page,
      limit,
      total,
      total_pages: totalPages,
    },
  };
};
