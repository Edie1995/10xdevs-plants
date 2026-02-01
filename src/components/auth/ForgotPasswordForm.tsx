import { useId, useState } from "react";
import type { FormEvent } from "react";

import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { apiPost } from "../../lib/api/api-client";
import AuthFormShell from "./AuthFormShell";

interface ForgotPasswordErrors {
  email?: string;
}

const isValidEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value);

export default function ForgotPasswordForm() {
  const emailId = useId();
  const emailErrorId = useId();

  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<ForgotPasswordErrors>({});
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const nextErrors: ForgotPasswordErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = "Podaj adres e-mail.";
    } else if (!isValidEmail(trimmedEmail)) {
      nextErrors.email = "Podaj poprawny adres e-mail.";
    }

    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    const result = await apiPost("/api/auth/forgot-password", { email: trimmedEmail });
    setIsSubmitting(false);

    if (result.error) {
      setFormError(result.error.message ?? "Nieoczekiwany blad.");
      return;
    }

    toast.success("Jesli konto istnieje, wyslalismy instrukcje resetu hasla.");
    setSent(true);
  };

  return (
    <AuthFormShell
      title="Odzyskaj haslo"
      description="Podaj adres e-mail, a wyslemy instrukcje odzyskania konta."
      footer={
        <span>
          Pamietasz haslo?{" "}
          <a href="/auth/login" className="font-medium text-neutral-900 underline-offset-4 hover:underline">
            Wroc do logowania
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
        {sent ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Jesli konto istnieje, wyslalismy instrukcje resetu hasla.
          </div>
        ) : null}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Wysylanie..." : "Wyslij link resetu"}
        </Button>
      </form>
    </AuthFormShell>
  );
}
