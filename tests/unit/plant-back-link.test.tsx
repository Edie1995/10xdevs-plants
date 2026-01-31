import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import PlantBackLink from "../../src/components/plants/PlantBackLink";

describe("PlantBackLink", () => {
  beforeEach(() => {
    vi.stubGlobal("location", { origin: "http://example.test" });
    Object.defineProperty(document, "referrer", { value: "", configurable: true });
  });

  it("uses safe returnTo when provided", () => {
    render(<PlantBackLink returnTo="http://example.test/app/plants/plant-1?tab=basic#top" />);

    const link = screen.getByRole("link", { name: "Wroc do listy" });
    expect(link).toHaveAttribute("href", "/app/plants/plant-1?tab=basic#top");
  });

  it("falls back when returnTo is unsafe", () => {
    render(<PlantBackLink returnTo="https://evil.test/app/plants" fallbackHref="/app/plants" />);

    const link = screen.getByRole("link", { name: "Wroc do listy" });
    expect(link).toHaveAttribute("href", "/app/plants");
  });

  it("uses referrer when returnTo is missing", () => {
    Object.defineProperty(document, "referrer", { value: "http://example.test/app/plants?page=2", configurable: true });

    render(<PlantBackLink />);

    const link = screen.getByRole("link", { name: "Wroc do listy" });
    expect(link).toHaveAttribute("href", "/app/plants?page=2");
  });
});
