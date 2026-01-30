import type { SupabaseClient } from "../../db/supabase.client.ts";
import type {
  DashboardDto,
  DashboardQueryDto,
  DashboardStatsDto,
  PaginationDto,
  PlantCardListItemDto,
} from "../../types.ts";

const PLANT_CARD_COLUMNS = [
  "id",
  "name",
  "icon_key",
  "color_hex",
  "difficulty",
  "status_priority",
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

type FilterQuery<T> = {
  eq: (column: string, value: string) => T;
  ilike: (column: string, pattern: string) => T;
};

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
  return "status_priority";
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

  let listQuery = supabase
    .from("plant_card")
    .select(PLANT_CARD_COLUMNS, { count: "exact" });

  listQuery = applyBaseFilters(listQuery, userId, search);
  listQuery = listQuery.order(sortColumn, { ascending: direction === "asc" });

  if (sortColumn !== "name") {
    listQuery = listQuery.order("name", { ascending: true });
  }

  listQuery = listQuery.range(offset, offset + limit - 1);

  const { data: allPlants, error: listError, count } = await listQuery;

  if (listError) {
    throw listError;
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);
  const attentionLimit = Math.min(20, limit);
  const todayEndUtcIso = getEndOfTodayUtcIso();

  let attentionQuery = supabase.from("plant_card").select(PLANT_CARD_COLUMNS);
  attentionQuery = applyBaseFilters(attentionQuery, userId, search);
  attentionQuery = attentionQuery.or(
    `next_watering_at.lte.${todayEndUtcIso},next_fertilizing_at.lte.${todayEndUtcIso}`
  );
  attentionQuery = attentionQuery.order("status_priority", { ascending: true }).order("name", { ascending: true });
  attentionQuery = attentionQuery.limit(attentionLimit);

  const { data: requiresAttention, error: attentionError } = await attentionQuery;

  if (attentionError) {
    throw attentionError;
  }

  const buildCountQuery = () =>
    applyBaseFilters(
      supabase.from("plant_card").select("id", { count: "exact", head: true }),
      userId,
      search
    );

  const { count: urgentCount, error: urgentError } = await buildCountQuery().eq("status_priority", 0);

  if (urgentError) {
    throw urgentError;
  }

  const { count: warningCount, error: warningError } = await buildCountQuery().eq("status_priority", 1);

  if (warningError) {
    throw warningError;
  }

  const stats: DashboardStatsDto = {
    total_plants: total,
    urgent: urgentCount ?? 0,
    warning: warningCount ?? 0,
  };

  return {
    dashboard: {
      requires_attention: (requiresAttention ?? []) as PlantCardListItemDto[],
      all_plants: (allPlants ?? []) as PlantCardListItemDto[],
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
