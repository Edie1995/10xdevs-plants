import { useCallback, useEffect, useRef, useState } from "react";

import { apiGet, type ApiErrorViewModel } from "../../lib/api/api-client";
import type { ApiResponseDto, DashboardDto } from "../../types";
import {
  buildDashboardViewModel,
  type DashboardQueryState,
  type DashboardViewModel,
  type PaginationVM,
} from "../../lib/dashboard/dashboard-viewmodel";

interface DashboardDataState {
  data: DashboardViewModel | null;
  error: ApiErrorViewModel | null;
  isLoading: boolean;
  isRefreshing: boolean;
  authRequired: boolean;
}

const toPaginationVm = (
  response: ApiResponseDto<DashboardDto> | null,
  fallbackCount: number,
  query: DashboardQueryState
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

export const useDashboardData = (query: DashboardQueryState) => {
  const [state, setState] = useState<DashboardDataState>({
    data: null,
    error: null,
    isLoading: true,
    isRefreshing: false,
    authRequired: false,
  });
  const latestQueryRef = useRef(query);

  const fetchDashboard = useCallback(async (nextQuery: DashboardQueryState, options?: { isRefresh?: boolean }) => {
    latestQueryRef.current = nextQuery;
    setState((prev) => ({
      ...prev,
      error: null,
      authRequired: false,
      isLoading: prev.data === null,
      isRefreshing: options?.isRefresh ?? prev.data !== null,
    }));

    const result = await apiGet<DashboardDto>("/api/dashboard", nextQuery);

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

      const pagination = toPaginationVm(result.response, result.data.all_plants.length, nextQuery);

      return {
        ...prev,
        data: buildDashboardViewModel(result.data, pagination, nextQuery),
        error: null,
        authRequired: false,
        isLoading: false,
        isRefreshing: false,
      };
    });
  }, []);

  useEffect(() => {
    fetchDashboard(query, { isRefresh: true });
  }, [fetchDashboard, query]);

  const refetch = useCallback(() => {
    fetchDashboard(latestQueryRef.current, { isRefresh: true });
  }, [fetchDashboard]);

  return {
    ...state,
    refetch,
  };
};
