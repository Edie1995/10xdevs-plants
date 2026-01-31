import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { PLANTS_LIST_QUERY_DEFAULTS } from "../../src/lib/plants/plants-list-viewmodel";
import { usePlantsQueryState } from "../../src/components/hooks/usePlantsQueryState";

const setLocation = (path: string) => {
  window.history.replaceState(null, "", path);
};

describe("usePlantsQueryState", () => {
  beforeEach(() => {
    setLocation("/app/plants");
  });

  it("normalizes query from URL", () => {
    setLocation("/app/plants?page=-2&limit=50&search=%20%20%20&sort=invalid&direction=invalid");

    const { result } = renderHook(() => usePlantsQueryState());

    expect(result.current.query).toEqual({
      ...PLANTS_LIST_QUERY_DEFAULTS,
      page: 1,
      limit: 20,
      search: undefined,
    });
  });

  it("pushes normalized params and trims search", () => {
    const pushState = vi.spyOn(window.history, "pushState");
    const { result } = renderHook(() => usePlantsQueryState());

    const longSearch = "x".repeat(80);
    act(() => {
      result.current.setQuery({ search: longSearch, page: 2 });
    });

    expect(pushState).toHaveBeenCalled();
    const url = new URL(pushState.mock.calls.at(-1)?.[2] as string, window.location.origin);
    expect(url.searchParams.get("search")).toHaveLength(50);
    expect(url.searchParams.get("page")).toBe("2");
  });
});
