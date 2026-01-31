import { useState } from "react";
import { toast } from "sonner";

import { apiDelete, type ApiErrorViewModel } from "../../lib/api/api-client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import type { PlantCardVM } from "../../lib/dashboard/dashboard-viewmodel";

interface ConfirmDeletePlantDialogProps {
  open: boolean;
  plant: Pick<PlantCardVM, "id" | "name"> | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
  onError?: (error: ApiErrorViewModel) => void;
}

export default function ConfirmDeletePlantDialog({
  open,
  plant,
  onOpenChange,
  onDeleted,
  onError,
}: ConfirmDeletePlantDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!plant || isDeleting) {
      return;
    }

    setIsDeleting(true);
    const result = await apiDelete<null>(`/api/plants/${plant.id}`);
    setIsDeleting(false);

    if (result.error) {
      if (result.error.httpStatus === 401) {
        const redirectTo = encodeURIComponent(window.location.href);
        window.location.href = `/auth/login?redirectTo=${redirectTo}`;
        return;
      }

      if (
        result.error.httpStatus === 403 ||
        result.error.httpStatus === 404 ||
        result.error.code === "plant_not_found"
      ) {
        toast("Roslina nie istnieje lub brak dostepu.");
        onDeleted();
        onOpenChange(false);
        return;
      }

      if (result.error.httpStatus === 400) {
        toast.error("Nie udalo sie usunac rosliny. Odswiez i sprobuj ponownie.");
        onError?.(result.error);
        return;
      }

      if (result.error.httpStatus && result.error.httpStatus >= 500) {
        toast.error("Nie udalo sie usunac rosliny. Sprobuj ponownie.");
      }

      onError?.(result.error);
      return;
    }

    toast.success("Roslina zostala usunieta.");
    onDeleted();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Usunac rosline?</DialogTitle>
          <DialogDescription>
            Ta operacja jest nieodwracalna.
            {plant ? ` Usuniesz rosline: ${plant.name}.` : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={!plant || isDeleting}>
            {isDeleting ? "Usuwanie..." : "Usun"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
