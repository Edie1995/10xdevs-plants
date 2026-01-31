import type { PlantsListQueryState } from "../../lib/plants/plants-list-viewmodel";
import type { PlantCardVM } from "../../lib/dashboard/dashboard-viewmodel";
import EmptyState from "../common/EmptyState";
import PlantCard from "./PlantCard";

interface EmptyStateConfig {
  title: string;
  description?: string;
  primaryAction: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

interface PlantsListContentProps {
  items: PlantCardVM[];
  isLoading: boolean;
  query: PlantsListQueryState;
  emptyState?: EmptyStateConfig;
  onRequestDelete: (plant: PlantCardVM) => void;
  onRequestEdit: (plant: PlantCardVM) => void;
  onCareActionCompleted?: () => void;
}

const buildSkeletons = (count: number) =>
  Array.from({ length: count }, (_, index) => (
    <div
      key={`skeleton-${index}`}
      className="h-[220px] animate-pulse rounded-xl border border-neutral-200 bg-white/70"
    />
  ));

export const buildSections = (items: PlantCardVM[]) => {
  const urgent = items.filter((item) => item.statusPriority === 0);
  const today = items.filter((item) => item.statusPriority === 1);
  const ok = items.filter((item) => item.statusPriority === 2);

  return [
    { id: "urgent", title: "Pilne", items: urgent },
    { id: "today", title: "Na dzis", items: today },
    { id: "ok", title: "OK", items: ok },
  ].filter((section) => section.items.length > 0);
};

export const shouldShowSkeletons = ({
  isLoading,
  items,
  emptyState,
}: {
  isLoading: boolean;
  items: PlantCardVM[];
  emptyState?: EmptyStateConfig;
}) => Boolean(isLoading && items.length === 0 && !emptyState);

export default function PlantsListContent({
  items,
  isLoading,
  query,
  emptyState,
  onRequestDelete,
  onRequestEdit,
  onCareActionCompleted,
}: PlantsListContentProps) {
  const showSkeletons = shouldShowSkeletons({ isLoading, items, emptyState });

  if (items.length === 0 && emptyState) {
    return <EmptyState {...emptyState} />;
  }

  if (showSkeletons && items.length === 0) {
    return <div className="grid gap-4 md:grid-cols-2">{buildSkeletons(4)}</div>;
  }

  if (query.sort === "priority") {
    const sections = buildSections(items);

    return (
      <div className="space-y-10">
        {sections.map((section, index) => (
          <section key={section.id} className={index === 0 ? "" : "pt-2"}>
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">{section.title}</h2>
              <span className="text-xs text-neutral-500">{section.items.length} roslin</span>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {showSkeletons ? buildSkeletons(4) : null}
              {section.items.map((plant) => (
                <PlantCard
                  key={plant.id}
                  plant={plant}
                  variant="list"
                  onCareActionCompleted={onCareActionCompleted}
                  onRequestEdit={onRequestEdit}
                  onRequestDelete={() => onRequestDelete(plant)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {showSkeletons ? buildSkeletons(4) : null}
      {items.map((plant) => (
        <PlantCard
          key={plant.id}
          plant={plant}
          variant="list"
          onCareActionCompleted={onCareActionCompleted}
          onRequestEdit={onRequestEdit}
          onRequestDelete={() => onRequestDelete(plant)}
        />
      ))}
    </div>
  );
}
