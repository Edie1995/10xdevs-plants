import { useEffect, useRef } from "react";
import { toast } from "sonner";

import DashboardStats from "./DashboardStats";
import RequiresAttentionSection from "./RequiresAttentionSection";
import AllPlantsSection from "./AllPlantsSection";
import EmptyState from "../common/EmptyState";
import { useDashboardQueryState } from "../hooks/useDashboardQueryState";
import { useDashboardData } from "../hooks/useDashboardData";
import { DASHBOARD_QUERY_DEFAULTS, type DashboardQueryState } from "../../lib/dashboard/dashboard-viewmodel";

interface DashboardViewProps {
  initialUrl: string;
  initialQuery?: DashboardQueryState;
}

export default function DashboardView({ initialUrl }: DashboardViewProps) {
  const { query, setQuery } = useDashboardQueryState();
  const { data, error, isLoading, isRefreshing, authRequired, refetch } = useDashboardData(query);
  const lastToastRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authRequired) {
      return;
    }

    const redirectTo = encodeURIComponent(initialUrl);
    window.location.href = `/auth/login?redirectTo=${redirectTo}`;
  }, [authRequired, initialUrl]);

  useEffect(() => {
    if (!error) {
      return;
    }

    if (error.httpStatus === 400) {
      setQuery(DASHBOARD_QUERY_DEFAULTS, { replace: true });
      const toastKey = "dashboard:query-reset";
      if (lastToastRef.current !== toastKey) {
        toast.info("Przywrocono domyslne filtry.");
        lastToastRef.current = toastKey;
      }
    }
  }, [error, setQuery]);

  useEffect(() => {
    if (!error) {
      return;
    }

    const toastKey = `${error.code}:${error.httpStatus ?? ""}`;
    if (lastToastRef.current === toastKey) {
      return;
    }

    if (error.code === "empty_response") {
      toast.error("Brak danych z serwera. Sprobuj ponownie.");
      lastToastRef.current = toastKey;
      return;
    }

    if (typeof error.httpStatus === "number" && error.httpStatus >= 500) {
      toast.error("Nie udalo sie pobrac danych. Sprobuj ponownie.");
      lastToastRef.current = toastKey;
    }
  }, [error]);

  const stats = data?.stats ?? {
    totalPlants: 0,
    urgent: 0,
    warning: 0,
  };
  const requiresAttention = data?.requiresAttention ?? [];
  const allPlants = data?.allPlants ?? [];
  const pagination = data?.pagination ?? {
    page: query.page,
    limit: query.limit,
    total: 0,
    totalPages: 0,
  };

  const emptyGarden = !query.search && !isLoading && stats.totalPlants === 0;
  const noResults = !!query.search && !isLoading && allPlants.length === 0;

  const handleQueryChange = (next: DashboardQueryState) => {
    setQuery(next);
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {isRefreshing ? "Odswiezanie danych..." : "Przeglad Twoich roslin."}
          </p>
        </div>
      </div>

      <DashboardStats stats={stats} isLoading={isLoading} />

      {error &&
      (error.code === "empty_response" || (typeof error.httpStatus === "number" && error.httpStatus >= 500)) ? (
        <section className="mt-10 rounded-xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-base font-semibold text-red-800">Cos poszlo nie tak.</h2>
          <p className="mt-2 text-sm text-red-700">
            {error.code === "empty_response"
              ? "Brak danych z serwera. Sprobuj ponownie."
              : "Nie udalo sie pobrac danych. Sprobuj ponownie."}
          </p>
          <button
            type="button"
            className="mt-4 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white"
            onClick={refetch}
          >
            Sprobuj ponownie
          </button>
        </section>
      ) : null}

      {emptyGarden ? (
        <section className="mt-10">
          <EmptyState
            title="Twoj ogrod jest pusty."
            description="Dodaj pierwsza roslina, aby zaczac."
            primaryAction={{ label: "Dodaj roslina", href: "/app/plants/new" }}
          />
        </section>
      ) : null}

      <RequiresAttentionSection
        items={requiresAttention}
        onCareActionCompleted={refetch}
        onOpenScheduleCta={(plantId) => {
          window.location.href = `/app/plants/${plantId}?tab=schedule`;
        }}
      />

      {!emptyGarden ? (
        <AllPlantsSection
          items={allPlants}
          pagination={pagination}
          query={query}
          isLoading={isLoading}
          onQueryChange={handleQueryChange}
          onCareActionCompleted={refetch}
          emptyState={
            noResults
              ? {
                  title: `Brak wynikow dla: ${query.search ?? ""}`,
                  primaryAction: {
                    label: "Wyczysc wyszukiwanie",
                    onClick: () => setQuery({ ...query, search: undefined, page: 1 }),
                  },
                }
              : undefined
          }
        />
      ) : null}
    </main>
  );
}
