export type AppRouteKey = "dashboard" | "plants";

export interface AppNavItemVM {
  key: AppRouteKey;
  label: string;
  href: string;
  ariaLabel?: string;
  icon?: "home" | "leaf";
}

export const appNavItems: AppNavItemVM[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/app/dashboard",
    ariaLabel: "Przejdz do dashboardu",
    icon: "home",
  },
  {
    key: "plants",
    label: "Rosliny",
    href: "/app/plants",
    ariaLabel: "Przejdz do listy roslin",
    icon: "leaf",
  },
];
