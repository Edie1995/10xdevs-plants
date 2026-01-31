import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import type { PlantCardDetailDto } from "../../src/types";
import type { NewPlantFormValues } from "../../src/lib/plants/new-plant-viewmodel";
import { useCreatePlant } from "../../src/components/hooks/useCreatePlant";
import { apiPost } from "../../src/lib/api/api-client";

vi.mock("../../src/lib/api/api-client", () => ({
  apiPost: vi.fn(),
}));

const apiPostMock = vi.mocked(apiPost);

const buildValidValues = (overrides?: Partial<NewPlantFormValues>): NewPlantFormValues => ({
  name: "Monstera deliciosa",
  ...overrides,
});

describe("useCreatePlant", () => {
  beforeEach(() => {
    apiPostMock.mockReset();
  });

  it("blocks submit when name is missing", async () => {
    const { result } = renderHook(() => useCreatePlant());

    const response = await act(async () => result.current.submit(buildValidValues({ name: "  " })));

    expect(apiPostMock).not.toHaveBeenCalled();
    expect(response.errors).toMatchInlineSnapshot(`
      {
        "diseases": [],
        "fields": {
          "name": "Podaj nazwe rosliny.",
        },
        "schedules": {},
      }
    `);
  });

  it("flags invalid color and schedule intervals", async () => {
    const { result } = renderHook(() => useCreatePlant());

    const response = await act(async () =>
      result.current.submit(
        buildValidValues({
          color_hex: "123",
          schedules: [
            { season: "spring", watering_interval: 1.5, fertilizing_interval: 400 },
            { season: "summer", watering_interval: 0, fertilizing_interval: 0 },
            { season: "autumn", watering_interval: 0, fertilizing_interval: 0 },
            { season: "winter", watering_interval: 0, fertilizing_interval: 0 },
          ],
        }),
      ),
    );

    expect(apiPostMock).not.toHaveBeenCalled();
    expect(response.errors).toMatchInlineSnapshot(`
      {
        "diseases": [],
        "fields": {
          "color_hex": "Niepoprawny format koloru.",
        },
        "schedules": {
          "spring": {
            "fertilizing_interval": "Dozwolony zakres 0-365.",
            "watering_interval": "Wpisz liczbe calkowita.",
          },
        },
      }
    `);
  });

  it("flags disease name requirement and max length", async () => {
    const { result } = renderHook(() => useCreatePlant());

    const response = await act(async () =>
      result.current.submit(
        buildValidValues({
          diseases: [
            { name: " ", symptoms: "ok", advice: "ok" },
            { name: "x".repeat(60), symptoms: "ok", advice: "ok" },
          ],
        }),
      ),
    );

    expect(apiPostMock).not.toHaveBeenCalled();
    expect(response.errors).toMatchInlineSnapshot(`
      {
        "diseases": [
          {
            "name": "Podaj nazwe choroby.",
          },
          {
            "name": "Maksymalnie 50 znakow.",
          },
        ],
        "fields": {},
        "schedules": {},
      }
    `);
  });

  it("maps API validation errors to form fields", async () => {
    apiPostMock.mockResolvedValue({
      data: null,
      error: {
        code: "validation_error",
        message: "validation",
        httpStatus: 400,
        details: {
          fieldErrors: {
            name: ["Maksymalnie 50 znakow."],
            "schedules.1.watering_interval": ["Dozwolony zakres 0-365."],
            "diseases.0.name": ["Podaj nazwe choroby."],
          },
          formErrors: ["Niepoprawne dane."],
        },
      },
      httpStatus: 400,
      response: null,
    });

    const { result } = renderHook(() => useCreatePlant());
    const values = buildValidValues({
      schedules: [
        { season: "spring", watering_interval: 1, fertilizing_interval: 1 },
        { season: "summer", watering_interval: 1, fertilizing_interval: 1 },
      ],
      diseases: [{ name: "Zgnilizna", symptoms: "", advice: "" }],
    });

    const response = await act(async () => result.current.submit(values));

    expect(response.errors).toMatchInlineSnapshot(`
      {
        "diseases": [
          {
            "name": "Podaj nazwe choroby.",
          },
        ],
        "fields": {
          "name": "Maksymalnie 50 znakow.",
        },
        "form": "Niepoprawne dane.",
        "schedules": {
          "summer": {
            "watering_interval": "Dozwolony zakres 0-365.",
          },
        },
      }
    `);
  });

  it("normalizes payload and returns data on success", async () => {
    const payloadData = { id: "plant-1", name: "Monstera" } as PlantCardDetailDto;
    apiPostMock.mockResolvedValue({
      data: payloadData,
      error: null,
      httpStatus: 201,
      response: null,
    });

    const { result } = renderHook(() => useCreatePlant());
    const response = await act(async () =>
      result.current.submit(
        buildValidValues({
          name: "  Monstera  ",
          soil: "  ",
          position: "Polnocny parapet  ",
          color_hex: " #2f9e44 ",
          schedules: [
            { season: "spring", watering_interval: 7, fertilizing_interval: 14 },
            { season: "summer", watering_interval: 0, fertilizing_interval: 0 },
          ],
          diseases: [{ name: "  Zgnilizna ", symptoms: "  objawy ", advice: "  " }],
        }),
      ),
    );

    const [path, payload] = apiPostMock.mock.calls[0];
    expect(path).toBe("/api/plants");
    expect(payload).toMatchInlineSnapshot(`
      {
        "color_hex": "#2f9e44",
        "difficulty": undefined,
        "diseases": [
          {
            "advice": undefined,
            "name": "Zgnilizna",
            "symptoms": "objawy",
          },
        ],
        "icon_key": undefined,
        "name": "Monstera",
        "notes": undefined,
        "position": "Polnocny parapet",
        "pot": undefined,
        "propagation_instructions": undefined,
        "repotting_instructions": undefined,
        "schedules": [
          {
            "fertilizing_interval": 14,
            "season": "spring",
            "watering_interval": 7,
          },
          {
            "fertilizing_interval": 0,
            "season": "summer",
            "watering_interval": 0,
          },
        ],
        "soil": undefined,
        "watering_instructions": undefined,
      }
    `);
    expect(response.result.data).toEqual(payloadData);
  });

  it("marks authRequired on 401 responses", async () => {
    apiPostMock.mockResolvedValue({
      data: null,
      error: {
        code: "unauthorized",
        message: "Unauthorized",
        httpStatus: 401,
      },
      httpStatus: 401,
      response: null,
    });

    const { result } = renderHook(() => useCreatePlant());
    await act(async () => {
      await result.current.submit(buildValidValues());
    });

    await waitFor(() => {
      expect(result.current.authRequired).toBe(true);
    });
  });
});
