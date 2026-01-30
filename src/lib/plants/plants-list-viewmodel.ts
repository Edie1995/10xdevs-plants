import type { PlantCardListItemDto } from "../../types";
import type { PaginationVM, PlantCardVM } from "../dashboard/dashboard-viewmodel";
import { mapPlantCardDto } from "../dashboard/dashboard-viewmodel";

export interface PlantsListQueryState {
  page: number;
  limit: number;
  search?: string;
  sort: "priority" | "name" | "created";
  direction: "asc" | "desc";
}

export const PLANTS_LIST_QUERY_DEFAULTS: PlantsListQueryState = {
  page: 1,
  limit: 20,
  sort: "priority",
  direction: "asc",
};

export interface PlantsListViewModel {
  items: PlantCardVM[];
  pagination: PaginationVM;
  query: PlantsListQueryState;
}

export const buildPlantsListViewModel = (
  items: PlantCardListItemDto[],
  pagination: PaginationVM,
  query: PlantsListQueryState
): PlantsListViewModel => ({
  items: items.map(mapPlantCardDto),
  pagination,
  query,
});
