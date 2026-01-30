import { useCallback, useEffect, useState } from "react";

import {
  DASHBOARD_QUERY_DEFAULTS,
  type DashboardQueryState,
} from "../../lib/dashboard/dashboard-viewmodel";

type QueryPatch = Partial<DashboardQueryState> | ((prev: DashboardQueryState) => DashboardQueryState);

const SORT_OPTIONS = ["priority", "name", "created"] as const;
const DIRECTION_OPTIONS = ["asc", "desc"] as const;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const normalizeSearch = (value?: string | null) => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.slice(0, 50);
};

const parseNumberParam = (value: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizeQuery = (input: Partial<DashboardQueryState>): DashboardQueryState => {
  const page = parseNumberParam(String(input.page ?? "")) ?? DASHBOARD_QUERY_DEFAULTS.page;
  const limitRaw = parseNumberParam(String(input.limit ?? "")) ?? DASHBOARD_QUERY_DEFAULTS.limit;
  const limit = clamp(limitRaw, 1, 20);
  const search = normalizeSearch(input.search);
  const sort = SORT_OPTIONS.includes(input.sort as (typeof SORT_OPTIONS)[number])
    ? (input.sort as DashboardQueryState["sort"])
    : DASHBOARD_QUERY_DEFAULTS.sort;
  const direction = DIRECTION_OPTIONS.includes(input.direction as (typeof DIRECTION_OPTIONS)[number])
    ? (input.direction as DashboardQueryState["direction"])
    : DASHBOARD_QUERY_DEFAULTS.direction;

  return {
    page: Math.max(page, 1),
    limit,
    search,
    sort,
    direction,
  };
};

const toSearchParams = (query: DashboardQueryState) => {
  const params = new URLSearchParams();

  if (query.page !== DASHBOARD_QUERY_DEFAULTS.page) {
    params.set("page", String(query.page));
  }

  if (query.limit !== DASHBOARD_QUERY_DEFAULTS.limit) {
    params.set("limit", String(query.limit));
  }

  if (query.search) {
    params.set("search", query.search);
  }

  if (query.sort !== DASHBOARD_QUERY_DEFAULTS.sort) {
    params.set("sort", query.sort);
  }

  if (query.direction !== DASHBOARD_QUERY_DEFAULTS.direction) {
    params.set("direction", query.direction);
  }

  return params;
};

const readQueryFromLocation = (): DashboardQueryState => {
  if (typeof window === "undefined") {
    return DASHBOARD_QUERY_DEFAULTS;
  }

  const params = new URLSearchParams(window.location.search);
  return normalizeQuery({
    page: parseNumberParam(params.get("page")) ?? undefined,
    limit: parseNumberParam(params.get("limit")) ?? undefined,
    search: params.get("search") ?? undefined,
    sort: params.get("sort") as DashboardQueryState["sort"],
    direction: params.get("direction") as DashboardQueryState["direction"],
  });
};

export const useDashboardQueryState = () => {
  const [query, setQueryState] = useState<DashboardQueryState>(() => readQueryFromLocation());

  const setQuery = useCallback((next: QueryPatch, options?: { replace?: boolean }) => {
    if (typeof window === "undefined") {
      return;
    }

    setQueryState((prev) => {
      const resolved = typeof next === "function" ? next(prev) : { ...prev, ...next };
      const normalized = normalizeQuery(resolved);
      const params = toSearchParams(normalized);
      const url = new URL(window.location.href);
      url.search = params.toString();

      if (options?.replace) {
        window.history.replaceState(null, "", url.toString());
      } else {
        window.history.pushState(null, "", url.toString());
      }

      return normalized;
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePopState = () => {
      setQueryState(readQueryFromLocation());
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return { query, setQuery };
};
