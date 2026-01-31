import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { DASHBOARD_QUERY_DEFAULTS } from "../../src/lib/dashboard/dashboard-viewmodel";
import { useDashboardQueryState } from "../../src/components/hooks/useDashboardQueryState";

const setLocation = (path: string) => {
  window.history.replaceState(null, "", path);
};

describe("useDashboardQueryState", () => {
  beforeEach(() => {
    setLocation("/app/dashboard");
  });

  it("normalizes query from URL", () => {
    setLocation("/app/dashboard?page=0&limit=999&search=%20&sort=invalid&direction=invalid");

    const { result } = renderHook(() => useDashboardQueryState());

    expect(result.current.query).toEqual({
      ...DASHBOARD_QUERY_DEFAULTS,
      page: 1,
      limit: 20,
      search: undefined,
    });
  });

  it("uses replaceState when requested", () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    const { result } = renderHook(() => useDashboardQueryState());

    act(() => {
      result.current.setQuery({ page: 3 }, { replace: true });
    });

    expect(replaceState).toHaveBeenCalled();
    const url = new URL(replaceState.mock.calls.at(-1)?.[2] as string, window.location.origin);
    expect(url.searchParams.get("page")).toBe("3");
  });
});
