import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import EmptyState from "../../src/components/common/EmptyState";

describe("EmptyState", () => {
  it("renders title, description and handles action click", () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="Brak danych"
        description="Dodaj pierwsza roslina."
        primaryAction={{ label: "Dodaj", onClick }}
      />
    );

    expect(screen.getByText("Brak danych")).toBeInTheDocument();
    expect(screen.getByText("Dodaj pierwsza roslina.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dodaj" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders link action when href is provided", () => {
    render(<EmptyState title="Brak danych" primaryAction={{ label: "Przejdz", href: "/app/plants/new" }} />);

    const link = screen.getByRole("link", { name: "Przejdz" });
    expect(link).toHaveAttribute("href", "/app/plants/new");
  });
});
