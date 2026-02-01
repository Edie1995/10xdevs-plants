import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import type { DashboardQueryState } from "../../src/lib/dashboard/dashboard-viewmodel";
import { DASHBOARD_QUERY_DEFAULTS } from "../../src/lib/dashboard/dashboard-viewmodel";
import DashboardView from "../../src/components/dashboard/DashboardView";
import { toast } from "sonner";

const allPlantsSectionPropsRef = vi.hoisted(() => ({ current: null as null | Record<string, unknown> }));
const emptyStatePropsRef = vi.hoisted(() => ({ current: null as null | Record<string, unknown> }));
const dashboardStatsPropsRef = vi.hoisted(() => ({ current: null as null | Record<string, unknown> }));

const useDashboardQueryStateMock = vi.fn();
const useDashboardDataMock = vi.fn();

vi.mock("../../src/components/hooks/useDashboardQueryState", () => ({
  useDashboardQueryState: () => useDashboardQueryStateMock(),
}));

vi.mock("../../src/components/hooks/useDashboardData", () => ({
  useDashboardData: (query: DashboardQueryState) => useDashboardDataMock(query),
}));

vi.mock("../../src/components/dashboard/AllPlantsSection", () => ({
  default: (props: Record<string, unknown>) => {
    allPlantsSectionPropsRef.current = props;
    return <div data-testid="AllPlantsSection" />;
  },
}));

vi.mock("../../src/components/dashboard/RequiresAttentionSection", () => ({
  default: () => <div data-testid="RequiresAttentionSection" />,
}));

vi.mock("../../src/components/dashboard/DashboardStats", () => ({
  default: (props: Record<string, unknown>) => {
    dashboardStatsPropsRef.current = props;
    return <div data-testid="DashboardStats" />;
  },
}));

vi.mock("../../src/components/common/EmptyState", () => ({
  default: (props: Record<string, unknown>) => {
    emptyStatePropsRef.current = props;
    return <div data-testid="EmptyState" />;
  },
}));

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const buildQuery = (overrides: Partial<DashboardQueryState> = {}): DashboardQueryState => ({
  ...DASHBOARD_QUERY_DEFAULTS,
  ...overrides,
});

const setup = ({
  query = buildQuery(),
  dataOverrides = {},
  error = null,
  isLoading = false,
  isRefreshing = false,
  authRequired = false,
} = {}) => {
  const setQuery = vi.fn();
  const refetch = vi.fn();
  useDashboardQueryStateMock.mockReturnValue({ query, setQuery });
  useDashboardDataMock.mockReturnValue({
    data: {
      stats: { totalPlants: 1, urgent: 0, warning: 0 },
      requiresAttention: [],
      allPlants: [],
      pagination: { page: query.page, limit: query.limit, total: 0, totalPages: 1 },
      ...dataOverrides,
    },
    error,
    isLoading,
    isRefreshing,
    authRequired,
    refetch,
  });

  return { setQuery, refetch };
};

describe("DashboardView", () => {
  beforeEach(() => {
    allPlantsSectionPropsRef.current = null;
    emptyStatePropsRef.current = null;
    dashboardStatsPropsRef.current = null;
    useDashboardQueryStateMock.mockReset();
    useDashboardDataMock.mockReset();
    vi.mocked(toast.info).mockReset();
    vi.mocked(toast.error).mockReset();
  });

  it("redirects to login when auth is required", async () => {
    setup({ authRequired: true });
    vi.stubGlobal("location", { href: "http://example.test/app" });

    render(<DashboardView initialUrl="http://example.test/app" />);

    await waitFor(() => {
      expect(window.location.href).toBe("/auth/login?redirectTo=http%3A%2F%2Fexample.test%2Fapp");
    });
  });

  it("resets query and shows toast once on http 400", async () => {
    const { setQuery } = setup({
      error: { code: "invalid_query", message: "Bad request", httpStatus: 400 },
    });

    const { rerender } = render(<DashboardView initialUrl="http://example.test/app" />);

    await waitFor(() => {
      expect(setQuery).toHaveBeenCalledWith(DASHBOARD_QUERY_DEFAULTS, { replace: true });
      expect(toast.info).toHaveBeenCalledWith("Przywrocono domyslne filtry.");
    });

    rerender(<DashboardView initialUrl="http://example.test/app" />);

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledTimes(1);
    });
  });

  it("shows error section and retries on empty response", async () => {
    const { refetch } = setup({
      error: { code: "empty_response", message: "Empty response" },
    });

    render(<DashboardView initialUrl="http://example.test/app" />);

    expect(await screen.findByText("Cos poszlo nie tak.")).toBeInTheDocument();
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Brak danych z serwera. Sprobuj ponownie.");
    });

    screen.getByRole("button", { name: "Sprobuj ponownie" }).click();
    expect(refetch).toHaveBeenCalled();
  });

  it("renders empty garden state without all plants section", () => {
    setup({
      dataOverrides: { stats: { totalPlants: 0, urgent: 0, warning: 0 } },
    });

    render(<DashboardView initialUrl="http://example.test/app" />);

    expect(screen.getByTestId("EmptyState")).toBeInTheDocument();
    expect(screen.queryByTestId("AllPlantsSection")).not.toBeInTheDocument();
  });

  it("passes no-results empty state when search has no matches", () => {
    setup({
      query: buildQuery({ search: "Monstera" }),
      dataOverrides: { stats: { totalPlants: 2, urgent: 0, warning: 0 }, allPlants: [] },
    });

    render(<DashboardView initialUrl="http://example.test/app" />);

    const props = allPlantsSectionPropsRef.current;
    expect(props).toEqual(
      expect.objectContaining({
        emptyState: expect.objectContaining({
          title: "Brak wynikow dla: Monstera",
          primaryAction: expect.objectContaining({ label: "Wyczysc wyszukiwanie" }),
        }),
      })
    );
  });
});
