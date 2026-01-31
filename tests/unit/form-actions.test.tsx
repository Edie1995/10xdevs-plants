import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import FormActions from "../../src/components/plants/FormActions";

describe("FormActions", () => {
  it("renders submit and cancel buttons", () => {
    render(<FormActions isSubmitting={false} onCancel={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Zapisz" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anuluj" })).toBeInTheDocument();
  });

  it("calls onCancel and respects disabled state while submitting", () => {
    const onCancel = vi.fn();
    render(<FormActions isSubmitting onCancel={onCancel} />);

    const submitButton = screen.getByRole("button", { name: "Zapisywanie..." });
    const cancelButton = screen.getByRole("button", { name: "Anuluj" });

    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();

    fireEvent.click(cancelButton);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("disables submit when disableSubmit is true", () => {
    render(<FormActions isSubmitting={false} disableSubmit onCancel={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Zapisz" })).toBeDisabled();
  });
});
