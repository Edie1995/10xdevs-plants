import type { DashboardStatsVM } from "../../lib/dashboard/dashboard-viewmodel";
import { Card, CardContent } from "../ui/card";

interface DashboardStatsProps {
  stats: DashboardStatsVM;
  isLoading?: boolean;
}

export default function DashboardStats({ stats, isLoading }: DashboardStatsProps) {
  const tiles = [
    { label: "Wszystkie", value: stats.totalPlants },
    { label: "Pilne", value: stats.urgent },
    { label: "Na dzis", value: stats.warning },
  ];

  return (
    <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3" data-test-id="dashboard-stats">
      {tiles.map((tile) => (
        <Card key={tile.label} data-test-id={`dashboard-stat-${tile.label.toLowerCase().replace(/\s+/g, "-")}`}>
          <CardContent className="px-5 py-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500">{tile.label}</p>
            <p
              className="mt-3 text-2xl font-semibold text-neutral-900"
              data-test-id={`dashboard-stat-value-${tile.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {isLoading ? "—" : tile.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
