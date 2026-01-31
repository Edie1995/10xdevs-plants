import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import Pagination from "../../src/components/common/Pagination";

describe("Pagination", () => {
  it("renders nothing when totalPages is 1 or less", () => {
    render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Poprzednia" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nastepna" })).not.toBeInTheDocument();
  });

  it("disables previous button on first page", () => {
    render(<Pagination page={1} totalPages={3} onPageChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Poprzednia" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Nastepna" })).not.toBeDisabled();
  });

  it("disables next button on last page", () => {
    render(<Pagination page={3} totalPages={3} onPageChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Poprzednia" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Nastepna" })).toBeDisabled();
  });

  it("calls onPageChange when navigating", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={3} onPageChange={onPageChange} />);

    screen.getByRole("button", { name: "Poprzednia" }).click();
    screen.getByRole("button", { name: "Nastepna" }).click();

    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
