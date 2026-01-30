import { useCallback, useEffect, useState } from "react";

import type { PlantCardDetailDto } from "../../types";
import { mapPlantDetailToBasicDraft, type PlantBasicDraftVM } from "../../lib/plants/plant-basic-viewmodel";

export const usePlantBasicDraft = (plantDetail: PlantCardDetailDto | null) => {
  const [draft, setDraft] = useState<PlantBasicDraftVM | null>(() =>
    plantDetail ? mapPlantDetailToBasicDraft(plantDetail) : null
  );
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!plantDetail || dirty) {
      return;
    }

    setDraft(mapPlantDetailToBasicDraft(plantDetail));
  }, [dirty, plantDetail]);

  const setPatch = useCallback(
    (patch: Partial<PlantBasicDraftVM>) => {
      if (!plantDetail) {
        return;
      }

      setDraft((prev) => ({
        ...(prev ?? mapPlantDetailToBasicDraft(plantDetail)),
        ...patch,
      }));
      setDirty(true);
    },
    [plantDetail]
  );

  const resetToServer = useCallback(() => {
    if (!plantDetail) {
      return;
    }

    setDraft(mapPlantDetailToBasicDraft(plantDetail));
    setDirty(false);
  }, [plantDetail]);

  return {
    draft,
    dirty,
    setPatch,
    resetToServer,
    setDirty,
  };
};
