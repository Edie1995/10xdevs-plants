import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import Pagination from "../common/Pagination";
import EmptyState from "../common/EmptyState";
import ConfirmDeletePlantDialog from "./ConfirmDeletePlantDialog";
import PlantsListContent from "./PlantsListContent";
import PlantsToolbar from "./PlantsToolbar";
import { usePlantsQueryState } from "../hooks/usePlantsQueryState";
import { usePlantsData } from "../hooks/usePlantsData";
import { PLANTS_LIST_QUERY_DEFAULTS } from "../../lib/plants/plants-list-viewmodel";
import { Button } from "../ui/button";
import type { PlantCardVM } from "../../lib/dashboard/dashboard-viewmodel";

interface PlantsListViewProps {
  initialUrl: string;
}

export default function PlantsListView({ initialUrl }: PlantsListViewProps) {
  const { query, setQuery } = usePlantsQueryState();
  const { data, error, isLoading, isRefreshing, authRequired, refetch } = usePlantsData(query);
  const lastToastRef = useRef<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PlantCardVM | null>(null);

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
      setQuery(PLANTS_LIST_QUERY_DEFAULTS, { replace: true });
      const toastKey = "plants:query-reset";
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

  const items = data?.items ?? [];
  const pagination = data?.pagination ?? {
    page: query.page,
    limit: query.limit,
    total: 0,
    totalPages: 0,
  };

  const emptyGarden = !query.search && !isLoading && pagination.total === 0;
  const noResults = !!query.search && !isLoading && items.length === 0;

  useEffect(() => {
    if (pagination.totalPages > 0 && query.page > pagination.totalPages) {
      setQuery({ page: Math.max(pagination.totalPages, 1) });
      return;
    }

    if (pagination.totalPages === 0 && query.page !== 1) {
      setQuery({ page: 1 });
    }
  }, [pagination.totalPages, query.page, setQuery]);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Rosliny</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {isRefreshing ? "Odswiezanie danych..." : "Przegladaj swoje rosliny i dbaj o terminy."}
          </p>
        </div>
        <Button
          type="button"
          data-test-id="plants-list-add-button"
          onClick={() => (window.location.href = "/app/plants/new")}
        >
          Dodaj roslina
        </Button>
      </div>

      <section className="mt-8">
        <PlantsToolbar
          query={query}
          onChange={(patch) => setQuery((prev) => ({ ...prev, ...patch, page: 1 }))}
          onSubmit={(search) => setQuery((prev) => ({ ...prev, search, page: 1 }))}
          onClear={() => setQuery((prev) => ({ ...prev, search: undefined, page: 1 }))}
        />
      </section>

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

      <section className="mt-8">
        <PlantsListContent
          items={items}
          isLoading={isLoading}
          query={query}
          onCareActionCompleted={refetch}
          onRequestDelete={(plant) => setPendingDelete(plant)}
          onRequestEdit={(plant) => {
            window.location.href = `/app/plants/${plant.id}?tab=basic&edit=1`;
          }}
          emptyState={
            noResults
              ? {
                  title: `Brak wynikow dla: ${query.search ?? ""}`,
                  primaryAction: {
                    label: "Wyczysc wyszukiwanie",
                    onClick: () => setQuery((prev) => ({ ...prev, search: undefined, page: 1 })),
                  },
                }
              : emptyGarden
                ? {
                    title: "Twoj ogrod jest pusty.",
                    description: "Dodaj pierwsza roslina, aby zaczac.",
                    primaryAction: { label: "Dodaj roslina", href: "/app/plants/new" },
                  }
                : undefined
          }
        />
      </section>

      {!emptyGarden ? (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
        />
      ) : null}

      <ConfirmDeletePlantDialog
        open={Boolean(pendingDelete)}
        plant={pendingDelete ? { id: pendingDelete.id, name: pendingDelete.name } : null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
        onDeleted={() => {
          setPendingDelete(null);
          refetch();
        }}
      />
    </main>
  );
}
