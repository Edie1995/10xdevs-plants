import type { PlantTabKey } from "../../types";

export interface PlantTabsProps {
  activeTab: PlantTabKey;
  onTabChange: (tab: PlantTabKey) => void;
  tabs: { key: PlantTabKey; label: string }[];
}

const TabButton = ({ isActive, label, onClick }: { isActive: boolean; label: string; onClick: () => void }) => (
  <button
    type="button"
    role="tab"
    aria-selected={isActive}
    className={`rounded-md px-4 py-2 text-sm font-medium transition ${
      isActive ? "bg-emerald-700 text-white ring-2 ring-emerald-200" : "text-neutral-700 hover:bg-neutral-100"
    }`}
    onClick={onClick}
  >
    {label}
  </button>
);

export default function PlantTabs({ activeTab, onTabChange, tabs }: PlantTabsProps) {
  return (
    <div className="mt-6">
      <div role="tablist" aria-label="Zakladki szczegolow rosliny" className="flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <TabButton
            key={tab.key}
            isActive={tab.key === activeTab}
            label={tab.label}
            onClick={() => onTabChange(tab.key)}
          />
        ))}
      </div>
    </div>
  );
}
