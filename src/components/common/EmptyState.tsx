import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  title: string;
  description?: string;
  primaryAction: EmptyStateAction;
}

export default function EmptyState({ title, description, primaryAction }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="px-6 py-10 text-center">
        <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
        {description ? <p className="mt-2 text-sm text-neutral-600">{description}</p> : null}
        <div className="mt-6 flex justify-center">
          {primaryAction.href ? (
            <Button asChild>
              <a href={primaryAction.href}>{primaryAction.label}</a>
            </Button>
          ) : (
            <Button type="button" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
