import type { NewPlantFormErrors, NewPlantFormValues, PlantIconOption } from "../../lib/plants/new-plant-viewmodel";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import icon1 from "../../assets/icons/1.ico";
import icon2 from "../../assets/icons/2.ico";
import icon3 from "../../assets/icons/3.ico";
import icon4 from "../../assets/icons/4.ico";
import icon6 from "../../assets/icons/6.ico";
import icon8 from "../../assets/icons/8.ico";
import icon9 from "../../assets/icons/9.ico";
import icon10 from "../../assets/icons/10.ico";
import icon11 from "../../assets/icons/11.ico";
import icon12 from "../../assets/icons/12.ico";

interface PlantIdentificationSectionProps {
  values: NewPlantFormValues;
  errors: NewPlantFormErrors;
  onChange: (patch: Partial<NewPlantFormValues>) => void;
}

const iconOptions: PlantIconOption[] = [
  { key: "1", label: "Ikona 1", src: icon1 },
  { key: "2", label: "Ikona 2", src: icon2 },
  { key: "3", label: "Ikona 3", src: icon3 },
  { key: "4", label: "Ikona 4", src: icon4 },
  { key: "6", label: "Ikona 6", src: icon6 },
  { key: "8", label: "Ikona 8", src: icon8 },
  { key: "9", label: "Ikona 9", src: icon9 },
  { key: "10", label: "Ikona 10", src: icon10 },
  { key: "11", label: "Ikona 11", src: icon11 },
  { key: "12", label: "Ikona 12", src: icon12 },
];

export default function PlantIdentificationSection({
  values,
  errors,
  onChange,
}: PlantIdentificationSectionProps) {
  const iconError = errors.fields?.icon_key;
  const colorError = errors.fields?.color_hex;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-neutral-900">Identyfikacja</h2>
        <p className="text-sm text-neutral-600">Dodaj ikone i kolor, aby latwiej odroznic rosline.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-3">
          <label className="text-sm font-medium text-neutral-700">Ikona</label>
          <div className="grid grid-cols-5 gap-3 sm:grid-cols-6">
            {iconOptions.map((option) => {
              const isActive = values.icon_key === option.key;
              return (
                <Button
                  key={option.key}
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  className={cn(
                    "h-12 w-12 justify-center p-0",
                    isActive && "ring-2 ring-emerald-500 ring-offset-2"
                  )}
                  aria-label={option.label}
                  aria-pressed={isActive}
                  onClick={() => onChange({ icon_key: option.key })}
                >
                  {option.src ? (
                    <img src={option.src} alt="" className="h-10 w-10" loading="lazy" />
                  ) : (
                    option.key
                  )}
                </Button>
              );
            })}
          </div>
          {iconError ? (
            <p className="text-xs text-red-600" role="alert">
              {iconError}
            </p>
          ) : null}
        </div>
        <div className="space-y-3">
          <label className="text-sm font-medium text-neutral-700" htmlFor="plant-color">
            Kolor
          </label>
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full border border-neutral-200"
              style={{ backgroundColor: values.color_hex ?? "#f5f5f5" }}
              aria-hidden="true"
            />
            <input
              id="plant-color"
              type="color"
              value={values.color_hex ?? "#2f9e44"}
              onChange={(event) => onChange({ color_hex: event.target.value })}
              className="h-10 w-16 cursor-pointer rounded-md border border-neutral-200 bg-transparent"
              aria-invalid={Boolean(colorError)}
              aria-describedby={colorError ? "plant-color-error" : "plant-color-help"}
            />
            <span className="text-sm text-neutral-600">{values.color_hex ?? "#2f9e44"}</span>
          </div>
          {colorError ? (
            <p id="plant-color-error" className="text-xs text-red-600" role="alert">
              {colorError}
            </p>
          ) : null}
          <p id="plant-color-help" className="text-xs text-neutral-500">
            Wprowadz kolor w formacie #RRGGBB.
          </p>
        </div>
      </div>
    </section>
  );
}
