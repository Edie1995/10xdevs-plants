import { useCallback, useEffect, useState } from "react";

import type { PlantTabKey } from "../../types";

const TAB_OPTIONS = ["basic", "schedule", "diseases", "history"] as const;
const DEFAULT_TAB: PlantTabKey = "basic";

const normalizeTab = (value: string | null | undefined, fallback: PlantTabKey) => {
  if (!value) {
    return fallback;
  }

  return (TAB_OPTIONS.includes(value as (typeof TAB_OPTIONS)[number]) ? value : fallback) as PlantTabKey;
};

const readTabFromLocation = (fallback: PlantTabKey) => {
  if (typeof window === "undefined") {
    return fallback;
  }

  const params = new URLSearchParams(window.location.search);
  return normalizeTab(params.get("tab"), fallback);
};

export const usePlantTabState = (fallbackTab: PlantTabKey = DEFAULT_TAB) => {
  const [tab, setTabState] = useState<PlantTabKey>(() => readTabFromLocation(fallbackTab));

  const setTab = useCallback(
    (next: PlantTabKey, options?: { replace?: boolean }) => {
      if (typeof window === "undefined") {
        return;
      }

      setTabState(() => {
        const normalized = normalizeTab(next, fallbackTab);
        const params = new URLSearchParams(window.location.search);

        if (normalized === DEFAULT_TAB) {
          params.delete("tab");
        } else {
          params.set("tab", normalized);
        }

        const url = new URL(window.location.href);
        url.search = params.toString();

        if (options?.replace) {
          window.history.replaceState(null, "", url.toString());
        } else {
          window.history.pushState(null, "", url.toString());
        }

        return normalized;
      });
    },
    [fallbackTab]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePopState = () => {
      setTabState(readTabFromLocation(fallbackTab));
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [fallbackTab]);

  return { tab, setTab };
};
