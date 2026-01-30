import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";

import { Button } from "../ui/button";

export interface PlantBackLinkProps {
  returnTo?: string | null;
  fallbackHref?: string;
}

const isSafePlantsPath = (url: URL) =>
  url.origin === window.location.origin && url.pathname.startsWith("/app/plants");

const resolveSafeHref = (returnTo?: string | null, fallbackHref = "/app/plants") => {
  if (typeof window === "undefined") {
    return fallbackHref;
  }

  if (returnTo) {
    try {
      const candidate = new URL(returnTo, window.location.origin);
      if (isSafePlantsPath(candidate)) {
        return candidate.pathname + candidate.search + candidate.hash;
      }
    } catch {
      return fallbackHref;
    }
  }

  if (document.referrer) {
    try {
      const referrer = new URL(document.referrer);
      if (isSafePlantsPath(referrer)) {
        return referrer.pathname + referrer.search + referrer.hash;
      }
    } catch {
      return fallbackHref;
    }
  }

  return fallbackHref;
};

export default function PlantBackLink({ returnTo, fallbackHref = "/app/plants" }: PlantBackLinkProps) {
  const href = useMemo(() => resolveSafeHref(returnTo, fallbackHref), [fallbackHref, returnTo]);

  return (
    <Button variant="link" asChild className="px-0 text-neutral-600 hover:text-neutral-900">
      <a href={href}>
        <ArrowLeft className="h-4 w-4" />
        Wroc do listy
      </a>
    </Button>
  );
}
