import type { PlantCardDetailDto } from "../../types";
import { mapPlantCardDto } from "../dashboard/dashboard-viewmodel";

export type PlantHeaderVM = {
  id: string;
  name: string;
  iconKey: string | null;
  colorHex: string | null;
  statusPriority: 0 | 1 | 2;
  statusLabel: "Pilne" | "Na dziś" | "OK";
  statusTone: "danger" | "warning" | "neutral";
  nextWateringDisplay: string;
  nextFertilizingDisplay: string;
  links: {
    detailsHref: string;
    scheduleHref: string;
  };
};

export const mapPlantDetailToHeader = (plant: PlantCardDetailDto): PlantHeaderVM => {
  const cardVm = mapPlantCardDto(plant);

  return {
    id: cardVm.id,
    name: cardVm.name,
    iconKey: cardVm.iconKey,
    colorHex: cardVm.colorHex,
    statusPriority: cardVm.statusPriority,
    statusLabel: cardVm.statusLabel,
    statusTone: cardVm.statusTone,
    nextWateringDisplay: cardVm.nextWateringDisplay,
    nextFertilizingDisplay: cardVm.nextFertilizingDisplay,
    links: {
      detailsHref: `/app/plants/${cardVm.id}?tab=basic`,
      scheduleHref: `/app/plants/${cardVm.id}?tab=schedule`,
    },
  };
};
