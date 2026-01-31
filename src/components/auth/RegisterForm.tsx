import { useId, useState } from "react";
import type { FormEvent } from "react";

import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { apiPost } from "../../lib/api/api-client";
import AuthFormShell from "./AuthFormShell";

interface RegisterFormProps {
  redirectTo?: string;
  initialEmail?: string;
}

type RegisterErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

const MIN_PASSWORD_LENGTH = 8;
const isValidEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value);
const sanitizeRedirectPath = (value?: string) => {
  if (!value) {
    return undefined;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return undefined;
  }

  if (value.includes("..") || value.includes("\\")) {
    return undefined;
  }

  return value;
};

export default function RegisterForm({ redirectTo, initialEmail }: RegisterFormProps) {
  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();
  const confirmPasswordErrorId = useId();

  const [email, setEmail] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const nextErrors: RegisterErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = "Podaj adres e-mail.";
    } else if (!isValidEmail(trimmedEmail)) {
      nextErrors.email = "Podaj poprawny adres e-mail.";
    }

    if (!password) {
      nextErrors.password = "Podaj haslo.";
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
    const result = await apiPost<{ user: { id: string }; session_active: boolean }>("/api/auth/register", {
      email: trimmedEmail,
      password,
      confirmPassword,
      redirectTo,
    });
    setIsSubmitting(false);

    if (result.error) {
      setFormError(result.error.message ?? "Nieoczekiwany blad.");
      return;
    }

    toast.success("Wyslalismy maila z linkiem do potwierdzenia konta.");
    setConfirmationSent(true);
    window.location.href = `/?toast=confirm-email-sent&email=${encodeURIComponent(trimmedEmail)}`;
  };

  return (
    <AuthFormShell
      title="Zaloz konto"
      description="Utworz konto, aby zaczac zarzadzac roslinami."
      footer={
        <span>
          Masz juz konto?{" "}
          <a href="/auth/login" className="font-medium text-neutral-900 underline-offset-4 hover:underline">
            Zaloguj sie
          </a>
          .
        </span>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
        {formError ? (
          <p className="text-sm text-red-600" role="alert">
            {formError}
          </p>
        ) : null}
        {confirmationSent ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Na podany adres e-mail wyslalismy link do potwierdzenia konta.
          </p>
        ) : null}
        <div className="space-y-1">
          <label htmlFor={emailId} className="text-sm font-medium text-neutral-800">
            E-mail
          </label>
          <Input
            id={emailId}
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="np. johndoe@gmail.com"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? emailErrorId : undefined}
          />
          {errors.email ? (
            <p id={emailErrorId} className="text-xs text-red-600" role="alert">
              {errors.email}
            </p>
          ) : null}
        </div>
        <div className="space-y-1">
          <label htmlFor={passwordId} className="text-sm font-medium text-neutral-800">
            Haslo
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
          {isSubmitting ? "Rejestracja..." : "Utworz konto"}
        </Button>
      </form>
    </AuthFormShell>
  );
}
