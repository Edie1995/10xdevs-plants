import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiDelete, apiPost, apiPut } from "../../lib/api/api-client";
import type { ApiErrorViewModel } from "../../lib/api/api-client";
import type { DiseaseDto } from "../../types";
import {
  createInlineConfirmState,
  mapDiseaseApiErrors,
  mapDiseaseToDraft,
  mapDraftToCreateCommand,
  mapDraftToUpdateCommand,
  type DiseaseDraftVM,
  type DiseaseErrorsVM,
  type DiseaseItemVM,
  validateDiseaseDraft,
} from "../../lib/plants/plant-diseases-viewmodel";

const confirmWindowMs = 5000;

const buildItem = (disease: DiseaseDto): DiseaseItemVM => ({
  id: disease.id,
  data: disease,
  isOpen: false,
  mode: "read",
  draft: mapDiseaseToDraft(disease),
  errors: null,
  isSaving: false,
  deleteConfirm: createInlineConfirmState(),
});

export const useDiseasesCrud = (
  plantId: string,
  initialDiseases: DiseaseDto[],
  onApiError?: (error: ApiErrorViewModel) => void,
) => {
  const [items, setItems] = useState<DiseaseItemVM[]>(() => initialDiseases.map(buildItem));
  const timersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    setItems(initialDiseases.map(buildItem));
  }, [initialDiseases]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const setItem = useCallback((id: string, patch: Partial<DiseaseItemVM>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const add = useCallback(
    async (draft: DiseaseDraftVM) => {
      const validation = validateDiseaseDraft(draft);
      if (validation) {
        return { data: null, error: null, validation };
      }

      const response = await apiPost<DiseaseDto>(
        `/api/plants/${plantId}/diseases`,
        mapDraftToCreateCommand(draft),
      );

      if (response.error) {
        if (response.error.httpStatus === 400 && response.error.code === "validation_error") {
          return { data: null, error: response.error, validation: mapDiseaseApiErrors(response.error.details) };
        }
        onApiError?.(response.error);
        return { data: null, error: response.error, validation: null };
      }

      if (response.data) {
        setItems((prev) => [
          {
            ...buildItem(response.data),
            isOpen: true,
          },
          ...prev,
        ]);
      }

      return { data: response.data, error: null, validation: null };
    },
    [onApiError, plantId],
  );

  const startEdit = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              mode: "edit",
              draft: mapDiseaseToDraft(item.data),
              errors: null,
              isOpen: true,
            }
          : item,
      ),
    );
  }, []);

  const cancelEdit = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              mode: "read",
              draft: mapDiseaseToDraft(item.data),
              errors: null,
            }
          : item,
      ),
    );
  }, []);

  const updateDraft = useCallback(
    (id: string, patch: Partial<DiseaseDraftVM>) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                draft: { ...item.draft, ...patch },
              }
            : item,
        ),
      );
    },
    [],
  );

  const save = useCallback(
    async (id: string) => {
      const current = items.find((item) => item.id === id);
      if (!current) {
        return { data: null, error: null, validation: null };
      }

      const validation = validateDiseaseDraft(current.draft);
      if (validation) {
        setItem(id, { errors: validation });
        return { data: null, error: null, validation };
      }

      setItem(id, { isSaving: true });
      const response = await apiPut<DiseaseDto>(
        `/api/plants/${plantId}/diseases/${id}`,
        mapDraftToUpdateCommand(current.draft),
      );
      setItem(id, { isSaving: false });

      if (response.error) {
        if (response.error.httpStatus === 400 && response.error.code === "validation_error") {
          const mapped = mapDiseaseApiErrors(response.error.details);
          setItem(id, { errors: mapped });
          return { data: null, error: response.error, validation: mapped };
        }

        onApiError?.(response.error);
        return { data: null, error: response.error, validation: null };
      }

      if (response.data) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  data: response.data,
                  mode: "read",
                  draft: mapDiseaseToDraft(response.data),
                  errors: null,
                }
              : item,
          ),
        );
      }

      return { data: response.data, error: null, validation: null };
    },
    [items, onApiError, plantId, setItem],
  );

  const requestDelete = useCallback(
    async (id: string) => {
      const current = items.find((item) => item.id === id);
      if (!current) {
        return;
      }

      const now = Date.now();
      if (current.deleteConfirm.armedAt && current.deleteConfirm.expiresAt && now < current.deleteConfirm.expiresAt) {
        const response = await apiDelete<null>(`/api/plants/${plantId}/diseases/${id}`);
        if (response.error) {
          onApiError?.(response.error);
          return;
        }
        setItems((prev) => prev.filter((item) => item.id !== id));
        return;
      }

      const expiresAt = now + confirmWindowMs;
      setItem(id, { deleteConfirm: { armedAt: now, expiresAt } });
      const timeout = window.setTimeout(() => {
        setItem(id, { deleteConfirm: createInlineConfirmState() });
        timersRef.current.delete(id);
      }, confirmWindowMs);
      timersRef.current.set(id, timeout);
    },
    [items, onApiError, plantId, setItem],
  );

  const toggleOpen = useCallback(
    (id: string, next: boolean) => {
      setItem(id, { isOpen: next });
    },
    [setItem],
  );

  const hasItems = useMemo(() => items.length > 0, [items.length]);

  return {
    items,
    hasItems,
    add,
    startEdit,
    cancelEdit,
    updateDraft,
    save,
    requestDelete,
    toggleOpen,
  };
};
