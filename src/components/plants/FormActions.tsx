import { Button } from "../ui/button";

interface FormActionsProps {
  isSubmitting: boolean;
  disableSubmit?: boolean;
  onCancel: () => void;
}

export default function FormActions({ isSubmitting, disableSubmit, onCancel }: FormActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="submit" disabled={isSubmitting || disableSubmit}>
        {isSubmitting ? "Zapisywanie..." : "Zapisz"}
      </Button>
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
        Anuluj
      </Button>
    </div>
  );
}
