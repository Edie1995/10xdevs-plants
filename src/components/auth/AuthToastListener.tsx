import { useEffect } from "react";

import { toast } from "sonner";

const TOAST_MESSAGES: Record<string, { type: "error" | "success" | "info"; message: string }> = {
  "auth-required": {
    type: "error",
    message: "Zaloguj sie, aby kontynuowac.",
  },
  "confirm-email-sent": {
    type: "success",
    message: "Na podany adres e-mail wyslalismy link do potwierdzenia konta.",
  },
  "auth-callback-failed": {
    type: "error",
    message: "Nie udalo sie potwierdzic sesji. Sprobuj ponownie.",
  },
};

export default function AuthToastListener() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const toastKey = url.searchParams.get("toast");
    if (!toastKey) {
      return;
    }

    const payload = TOAST_MESSAGES[toastKey];
    if (!payload) {
      return;
    }

    window.setTimeout(() => {
      if (payload.type === "success") {
        toast.success(payload.message);
      } else if (payload.type === "info") {
        toast.info(payload.message);
      } else {
        toast.error(payload.message);
      }
    }, 150);

    url.searchParams.delete("toast");
    window.history.replaceState({}, "", url.toString());
  }, []);

  return null;
}
