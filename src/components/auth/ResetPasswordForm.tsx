import { useId, useState } from "react";
import type { FormEvent } from "react";

import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { apiPost } from "../../lib/api/api-client";
import AuthFormShell from "./AuthFormShell";

type ResetPasswordErrors = {
  password?: string;
  confirmPassword?: string;
};

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordForm() {
  const passwordId = useId();
  const confirmPasswordId = useId();
  const passwordErrorId = useId();
  const confirmPasswordErrorId = useId();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<ResetPasswordErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const nextErrors: ResetPasswordErrors = {};

    if (!password) {
      nextErrors.password = "Podaj nowe haslo.";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `Haslo musi miec co najmniej ${MIN_PASSWORD_LENGTH} znakow.`;
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Potwierdz haslo.";
    } else if (password && confirmPassword !== password) {
      nextErrors.confirmPassword = "Hasla musza byc takie same.";
    }

    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    const result = await apiPost("/api/auth/reset-password", {
      password,
      confirmPassword,
    });
    setIsSubmitting(false);

    if (result.error) {
      setFormError(result.error.message ?? "Nieoczekiwany blad.");
      return;
    }

    toast.success("Haslo zostalo zmienione. Zaloguj sie ponownie.");
    window.location.href = "/auth/login";
  };

  return (
    <AuthFormShell
      title="Ustaw nowe haslo"
      description="Wpisz nowe haslo, aby odzyskac dostep do konta."
      footer={
        <span>
          Nie masz aktywnego linku?{" "}
          <a href="/auth/forgot-password" className="font-medium text-neutral-900 underline-offset-4 hover:underline">
            Wyslij link ponownie
          </a>
          .
        </span>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {formError ? (
          <p className="text-sm text-red-600" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="space-y-1">
          <label htmlFor={passwordId} className="text-sm font-medium text-neutral-800">
            Nowe haslo
          </label>
          <Input
            id={passwordId}
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? passwordErrorId : undefined}
          />
          {errors.password ? (
            <p id={passwordErrorId} className="text-xs text-red-600" role="alert">
              {errors.password}
            </p>
          ) : null}
        </div>
        <div className="space-y-1">
          <label htmlFor={confirmPasswordId} className="text-sm font-medium text-neutral-800">
            Potwierdz haslo
          </label>
          <Input
            id={confirmPasswordId}
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? confirmPasswordErrorId : undefined}
          />
          {errors.confirmPassword ? (
            <p id={confirmPasswordErrorId} className="text-xs text-red-600" role="alert">
              {errors.confirmPassword}
            </p>
          ) : null}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Zapisywanie..." : "Zapisz nowe haslo"}
        </Button>
      </form>
    </AuthFormShell>
  );
}
