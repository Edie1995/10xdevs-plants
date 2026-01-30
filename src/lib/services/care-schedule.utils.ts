import type { Season } from "../../types.ts";

export const parseDateOnlyToUtc = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return date;
};

export const formatUtcDateOnly = (date: Date): string => date.toISOString().slice(0, 10);

export const toUtcDateOnly = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export const getSeasonForDate = (date: Date): Season => {
  const month = date.getUTCMonth();

  if (month >= 2 && month <= 4) {
    return "spring";
  }

  if (month >= 5 && month <= 7) {
    return "summer";
  }

  if (month >= 8 && month <= 10) {
    return "autumn";
  }

  return "winter";
};

export const addDaysUtc = (date: Date, days: number): Date => {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

export const computeStatusPriority = (nextWateringAt: string | null, nextFertilizingAt: string | null): number => {
  const nextDates = [nextWateringAt, nextFertilizingAt]
    .filter((value): value is string => Boolean(value))
    .map((value) => toUtcDateOnly(new Date(value)));

  if (nextDates.length === 0) {
    return 2;
  }

  const nearest = new Date(Math.min(...nextDates.map((value) => value.getTime())));
  const today = toUtcDateOnly(new Date());

  if (nearest.getTime() < today.getTime()) {
    return 0;
  }

  if (nearest.getTime() === today.getTime()) {
    return 1;
  }

  return 2;
};
