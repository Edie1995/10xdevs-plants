import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import type { PlantsListQueryState } from "../../lib/plants/plants-list-viewmodel";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface PlantsToolbarProps {
  query: PlantsListQueryState;
  onChange: (patch: Partial<PlantsListQueryState>) => void;
  onSubmit: (search: string | undefined) => void;
  onClear: () => void;
}

const SORT_OPTIONS: { value: PlantsListQueryState["sort"]; label: string }[] = [
  { value: "priority", label: "Priorytet" },
  { value: "name", label: "Nazwa" },
  { value: "created", label: "Utworzenia" },
];

const DIRECTION_OPTIONS: { value: PlantsListQueryState["direction"]; label: string }[] = [
  { value: "asc", label: "Rosnaco" },
  { value: "desc", label: "Malejaco" },
];

export default function PlantsToolbar({ query, onChange, onSubmit, onClear }: PlantsToolbarProps) {
  const [searchValue, setSearchValue] = useState(query.search ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSearchValue(query.search ?? "");
  }, [query.search]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = searchValue.trim();
    if (trimmed.length > 50) {
      setError("Maksymalnie 50 znakow.");
      return;
    }

    setError(null);
    onSubmit(trimmed ? trimmed : undefined);
  };

  const handleClear = () => {
    setSearchValue("");
    setError(null);
    onClear();
  };

  return (
    <form
      className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4 md:flex-row md:items-center"
      onSubmit={handleSubmit}
    >
      <div className="flex-1">
        <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor="search">
          Szukaj
        </label>
        <div className="mt-1 flex gap-2">
          <Input
            id="search"
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            maxLength={50}
            placeholder="Wpisz nazwe rosliny"
            aria-describedby={error ? "search-error" : undefined}
          />
          <Button type="submit">Szukaj</Button>
          <Button type="button" variant="outline" onClick={handleClear}>
            Wyczysc
          </Button>
        </div>
        {error ? (
          <p id="search-error" className="mt-1 text-xs text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor="sort">
          Sortowanie
        </label>
        <Select value={query.sort} onValueChange={(value) => onChange({ sort: value as PlantsListQueryState["sort"] })}>
          <SelectTrigger id="sort" className="w-[160px]">
            <SelectValue placeholder="Wybierz" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor="direction">
          Kierunek
        </label>
        <Select
          value={query.direction}
          onValueChange={(value) => onChange({ direction: value as PlantsListQueryState["direction"] })}
        >
          <SelectTrigger id="direction" className="w-[160px]">
            <SelectValue placeholder="Wybierz" />
          </SelectTrigger>
          <SelectContent>
            {DIRECTION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </form>
  );
}
