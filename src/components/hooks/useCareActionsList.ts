import { useCallback, useEffect, useMemo, useState } from "react";

import { apiGet, type ApiErrorViewModel } from "../../lib/api/api-client";
import type { CareActionsListResultDto } from "../../types";
import type { CareActionsFilterVM, CareActionRowVM } from "../../lib/plants/plant-history-viewmodel";
import { mapCareLogToRow } from "../../lib/plants/plant-history-viewmodel";

export const useCareActionsList = (plantId: string, filter: CareActionsFilterVM) => {
  const [data, setData] = useState<CareActionRowVM[]>([]);
  const [error, setError] = useState<ApiErrorViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const params =
      filter.actionType === "all" ? { limit: filter.limit } : { action_type: filter.actionType, limit: filter.limit };

    const response = await apiGet<CareActionsListResultDto>(`/api/plants/${plantId}/care-actions`, params);
    setIsLoading(false);

    if (response.error) {
      setError(response.error);
      return;
    }

    setData((response.data ?? []).map(mapCareLogToRow));
  }, [filter.actionType, filter.limit, plantId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const isEmpty = useMemo(() => !isLoading && data.length === 0, [data.length, isLoading]);

  return {
    data,
    error,
    isLoading,
    isEmpty,
    refetch: fetchData,
  };
};
