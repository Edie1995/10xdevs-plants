import { useId, useState } from "react";
import type { FormEvent } from "react";

import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { apiPost } from "../../lib/api/api-client";
import AuthFormShell from "./AuthFormShell";

interface LoginFormProps {
  redirectTo?: string;
  initialEmail?: string;
}

type LoginErrors = {
  email?: string;
  password?: string;
};

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

export default function LoginForm({ redirectTo, initialEmail }: LoginFormProps) {
  const emailId = useId();
  const passwordId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();

  const [email, setEmail] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const nextErrors: LoginErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = "Podaj adres e-mail.";
    } else if (!isValidEmail(trimmedEmail)) {
      nextErrors.email = "Podaj poprawny adres e-mail.";
    }

    if (!password) {
      nextErrors.password = "Podaj haslo.";
    }

    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    const result = await apiPost<{ user: { id: string } }>("/api/auth/login", {
      email: trimmedEmail,
      password,
      redirectTo,
    });
    setIsSubmitting(false);

    if (result.error) {
      setFormError(result.error.message ?? "Nieoczekiwany blad.");
      return;
    }

    toast.success("Zalogowano. Przekierowujemy...");
    const nextPath = sanitizeRedirectPath(redirectTo) ?? "/app/dashboard";
    window.location.href = nextPath;
  };

  return (
    <AuthFormShell
      title="Zaloguj sie"
      description="Wpisz dane logowania, aby przejsc do aplikacji."
      footer={
        <>
          <span>
            Nie masz konta?{" "}
            <a href="/auth/register" className="font-medium text-neutral-900 underline-offset-4 hover:underline">
              Zaloz konto
            </a>
            .
          </span>
          <a href="/auth/forgot-password" className="font-medium text-neutral-900 underline-offset-4 hover:underline">
            Nie pamietasz hasla?
          </a>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {redirectTo ? (
          <input type="hidden" name="redirectTo" value={redirectTo} />
        ) : null}
        {formError ? (
          <p className="text-sm text-red-600" role="alert">
            {formError}
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
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? passwordErrorId : undefined}
          />
          {errors.password ? (
            <p id={passwordErrorId} className="text-xs text-red-600" role="alert">
              {errors.password}
            </p>
          ) : null}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Logowanie..." : "Zaloguj sie"}
        </Button>
      </form>
    </AuthFormShell>
  );
}
