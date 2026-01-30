import { useCallback, useEffect, useRef, useState } from "react";

import { apiGet, type ApiErrorViewModel } from "../../lib/api/api-client";
import type { ApiResponseDto, PlantCardListItemDto } from "../../types";
import {
  buildPlantsListViewModel,
  type PlantsListQueryState,
  type PlantsListViewModel,
} from "../../lib/plants/plants-list-viewmodel";
import type { PaginationVM } from "../../lib/dashboard/dashboard-viewmodel";

interface PlantsListDataState {
  data: PlantsListViewModel | null;
  error: ApiErrorViewModel | null;
  isLoading: boolean;
  isRefreshing: boolean;
  authRequired: boolean;
}

const toPaginationVm = (
  response: ApiResponseDto<PlantCardListItemDto[]> | null,
  fallbackCount: number,
  query: PlantsListQueryState
): PaginationVM => {
  const pagination = response?.pagination;
  if (!pagination) {
    const total = fallbackCount;
    return {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : 1,
    };
  }

  return {
    page: pagination.page,
    limit: pagination.limit,
    total: pagination.total,
    totalPages: pagination.total_pages,
  };
};

export const usePlantsData = (query: PlantsListQueryState) => {
  const [state, setState] = useState<PlantsListDataState>({
    data: null,
    error: null,
    isLoading: true,
    isRefreshing: false,
    authRequired: false,
  });
  const latestQueryRef = useRef(query);

  const fetchPlants = useCallback(async (nextQuery: PlantsListQueryState, options?: { isRefresh?: boolean }) => {
    latestQueryRef.current = nextQuery;
    setState((prev) => ({
      ...prev,
      error: null,
      authRequired: false,
      isLoading: prev.data === null,
      isRefreshing: options?.isRefresh ?? prev.data !== null,
    }));

    const result = await apiGet<PlantCardListItemDto[]>("/api/plants", nextQuery);

    setState((prev) => {
      if (latestQueryRef.current !== nextQuery) {
        return prev;
      }

      if (result.error) {
        const authRequired = result.error.httpStatus === 401;
        return {
          ...prev,
          error: result.error,
          authRequired,
          isLoading: false,
          isRefreshing: false,
        };
      }

      if (!result.data) {
        return {
          ...prev,
          error: {
            code: "empty_response",
            message: "Brak danych z serwera.",
            httpStatus: result.httpStatus,
          },
          isLoading: false,
          isRefreshing: false,
        };
      }

      const pagination = toPaginationVm(result.response, result.data.length, nextQuery);

      return {
        ...prev,
        data: buildPlantsListViewModel(result.data, pagination, nextQuery),
        error: null,
        authRequired: false,
        isLoading: false,
        isRefreshing: false,
      };
    });
  }, []);

  useEffect(() => {
    fetchPlants(query, { isRefresh: true });
  }, [fetchPlants, query]);

  const refetch = useCallback(() => {
    fetchPlants(latestQueryRef.current, { isRefresh: true });
  }, [fetchPlants]);

  return {
    ...state,
    refetch,
  };
};
