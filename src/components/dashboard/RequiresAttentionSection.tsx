import type { PlantCardVM } from "../../lib/dashboard/dashboard-viewmodel";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import PlantCard from "../plants/PlantCard";

type RequiresAttentionSectionProps = {
  items: PlantCardVM[];
  onCareActionCompleted: () => void;
  onOpenScheduleCta: (plantId: string) => void;
};

export default function RequiresAttentionSection(props: RequiresAttentionSectionProps) {
  if (!props.items.length) {
    return null;
  }

  return (
    <section className="mt-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-emerald-800">Wymagaja uwagi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {props.items.map((plant) => (
              <PlantCard
                key={plant.id}
                plant={plant}
                onCareActionCompleted={props.onCareActionCompleted}
                onNavigateToSchedule={props.onOpenScheduleCta}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
