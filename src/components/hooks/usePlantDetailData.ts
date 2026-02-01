import { useCallback, useEffect, useRef, useState } from "react";

import { apiGet, type ApiErrorViewModel } from "../../lib/api/api-client";
import type { PlantCardDetailDto } from "../../types";

interface PlantDetailState {
  data: PlantCardDetailDto | null;
  error: ApiErrorViewModel | null;
  isLoading: boolean;
  authRequired: boolean;
  notFound: boolean;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const usePlantDetailData = (plantId: string) => {
  const [state, setState] = useState<PlantDetailState>({
    data: null,
    error: null,
    isLoading: true,
    authRequired: false,
    notFound: false,
  });
  const latestIdRef = useRef(plantId);

  const fetchPlant = useCallback(async (nextId: string, options?: { isRefresh?: boolean }) => {
    latestIdRef.current = nextId;

    if (!UUID_REGEX.test(nextId)) {
      setState((prev) => ({
        ...prev,
        data: null,
        error: {
          code: "invalid_id",
          message: "Nieprawidlowy identyfikator rosliny.",
          httpStatus: 400,
        },
        isLoading: false,
        authRequired: false,
        notFound: true,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      error: null,
      authRequired: false,
      notFound: false,
      isLoading: prev.data === null || options?.isRefresh === true,
    }));

    const result = await apiGet<PlantCardDetailDto>(`/api/plants/${nextId}`);

    setState((prev) => {
      if (latestIdRef.current !== nextId) {
        return prev;
      }

      if (result.error) {
        const authRequired = result.error.httpStatus === 401;
        const notFound = result.error.httpStatus === 404 || result.error.code === "plant_not_found";

        return {
          ...prev,
          data: prev.data,
          error: result.error,
          authRequired,
          notFound,
          isLoading: false,
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
          authRequired: false,
          notFound: false,
          isLoading: false,
        };
      }

      return {
        ...prev,
        data: result.data,
        error: null,
        authRequired: false,
        notFound: false,
        isLoading: false,
      };
    });
  }, []);

  useEffect(() => {
    fetchPlant(plantId, { isRefresh: true });
  }, [fetchPlant, plantId]);

  const refetch = useCallback(() => {
    fetchPlant(latestIdRef.current, { isRefresh: true });
  }, [fetchPlant]);

  return {
    ...state,
    refetch,
  };
};
