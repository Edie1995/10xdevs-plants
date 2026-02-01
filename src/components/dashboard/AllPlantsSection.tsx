import type { DashboardQueryState, PaginationVM, PlantCardVM } from "../../lib/dashboard/dashboard-viewmodel";
import EmptyState from "../common/EmptyState";
import Pagination from "../common/Pagination";
import PlantCard from "../plants/PlantCard";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import DashboardToolbar from "./DashboardToolbar";

interface EmptyStateConfig {
  title: string;
  description?: string;
  primaryAction: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

interface AllPlantsSectionProps {
  items: PlantCardVM[];
  pagination: PaginationVM;
  query: DashboardQueryState;
  emptyState?: EmptyStateConfig;
  isLoading?: boolean;
  onQueryChange: (next: DashboardQueryState) => void;
  onCareActionCompleted: () => void;
}

const buildSkeletons = (count: number) =>
  Array.from({ length: count }, (_, index) => (
    <div
      key={`skeleton-${index}`}
      className="h-[220px] animate-pulse rounded-xl border border-neutral-200 bg-white/70"
    />
  ));

export default function AllPlantsSection({
  items,
  pagination,
  query,
  emptyState,
  isLoading,
  onQueryChange,
  onCareActionCompleted,
}: AllPlantsSectionProps) {
  const handlePatch = (patch: Partial<DashboardQueryState>) => {
    const resetPage = "search" in patch || "sort" in patch || "direction" in patch || "limit" in patch;
    onQueryChange({
      ...query,
      ...patch,
      page: resetPage ? 1 : (patch.page ?? query.page),
    });
  };

  const showSkeletons = Boolean(isLoading && items.length === 0 && !emptyState);

  return (
    <section className="mt-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-emerald-800">Wszystkie moje rosliny</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <DashboardToolbar
            query={query}
            onChange={handlePatch}
            onSubmit={(search) => handlePatch({ search })}
            onClear={() => handlePatch({ search: undefined })}
          />

          <div className="grid gap-4 md:grid-cols-2">
            {showSkeletons ? buildSkeletons(4) : null}
            {items.map((plant) => (
              <PlantCard key={plant.id} plant={plant} onCareActionCompleted={onCareActionCompleted} />
            ))}
          </div>

          {items.length === 0 && emptyState ? <EmptyState {...emptyState} /> : null}

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => handlePatch({ page })}
          />
        </CardContent>
      </Card>
    </section>
  );
}
