import { useState } from "react";

import { toast } from "sonner";
import { apiPost } from "../../lib/api/api-client";
import { Button } from "../ui/button";

export default function LogoutButton() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogout = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    const result = await apiPost("/api/auth/logout");
    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error.message ?? "Nie udalo sie wylogowac.");
      return;
    }

    toast.success("Wylogowano.");
    window.location.href = "/";
  };

  return (
    <Button type="button" variant="outline" onClick={handleLogout} disabled={isSubmitting}>
      {isSubmitting ? "Wylogowywanie..." : "Wyloguj"}
    </Button>
  );
}
