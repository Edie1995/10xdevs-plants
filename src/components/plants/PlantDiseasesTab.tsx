import { useState } from "react";
import { toast } from "sonner";

import type { ApiErrorViewModel } from "../../lib/api/api-client";
import type { DiseaseDto } from "../../types";
import { useDiseasesCrud } from "../hooks/useDiseasesCrud";
import {
  type DiseaseDraftVM,
  type DiseaseErrorsVM,
  validateDiseaseDraft,
} from "../../lib/plants/plant-diseases-viewmodel";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { cn } from "../../lib/utils";

export interface PlantDiseasesTabProps {
  plantId: string;
  initialDiseases: DiseaseDto[];
  onApiError: (error: ApiErrorViewModel) => void;
}

const textareaStyles =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive dark:aria-invalid:ring-destructive/40 dark:bg-input/30 min-h-[100px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]";

const emptyDraft: DiseaseDraftVM = {
  name: "",
  symptoms: null,
  advice: null,
};

export default function PlantDiseasesTab({ plantId, initialDiseases, onApiError }: PlantDiseasesTabProps) {
  const { items, hasItems, add, startEdit, cancelEdit, updateDraft, save, requestDelete, toggleOpen } = useDiseasesCrud(
    plantId,
    initialDiseases,
    onApiError
  );
  const [addDraft, setAddDraft] = useState<DiseaseDraftVM>(emptyDraft);
  const [addErrors, setAddErrors] = useState<DiseaseErrorsVM | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    const validation = validateDiseaseDraft(addDraft);
    if (validation) {
      setAddErrors(validation);
      toast.error("Popraw bledy w formularzu.");
      return;
    }

    setIsAdding(true);
    const result = await add(addDraft);
    setIsAdding(false);

    if (result.validation) {
      setAddErrors(result.validation);
      if (result.validation.form) {
        toast.error(result.validation.form);
      }
      return;
    }

    if (result.error) {
      toast.error("Nie udalo sie dodac choroby.");
      return;
    }

    setAddDraft(emptyDraft);
    setAddErrors(null);
    toast.success("Dodano chorobe.");
  };

  const renderFieldError = (error?: string, id?: string) =>
    error ? (
      <p id={id} className="mt-1 text-xs text-red-600" role="alert">
        {error}
      </p>
    ) : null;

  return (
    <section className="space-y-6 rounded-xl border border-neutral-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Choroby</h2>
        <p className="text-sm text-neutral-600">Dodaj choroby i zalecenia zwiazane z pielegnacja.</p>
      </div>

      <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <div className="text-sm font-medium text-neutral-700">Dodaj chorobe</div>
        {addErrors?.form ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {addErrors.form}
          </div>
        ) : null}
        <div>
          <label className="text-xs font-medium text-neutral-600" htmlFor="disease-add-name">
            Nazwa choroby *
          </label>
          <Input
            id="disease-add-name"
            value={addDraft.name}
            onChange={(event) => setAddDraft((prev) => ({ ...prev, name: event.target.value }))}
            maxLength={50}
            aria-invalid={Boolean(addErrors?.fields?.name)}
            aria-describedby={addErrors?.fields?.name ? "disease-add-name-error" : undefined}
          />
          {renderFieldError(addErrors?.fields?.name, "disease-add-name-error")}
        </div>
        <div>
          <label className="text-xs font-medium text-neutral-600" htmlFor="disease-add-symptoms">
            Objawy
          </label>
          <textarea
            id="disease-add-symptoms"
            className={cn(textareaStyles)}
            value={addDraft.symptoms ?? ""}
            onChange={(event) => setAddDraft((prev) => ({ ...prev, symptoms: event.target.value }))}
            maxLength={2000}
            aria-invalid={Boolean(addErrors?.fields?.symptoms)}
            aria-describedby={addErrors?.fields?.symptoms ? "disease-add-symptoms-error" : undefined}
          />
          {renderFieldError(addErrors?.fields?.symptoms, "disease-add-symptoms-error")}
        </div>
        <div>
          <label className="text-xs font-medium text-neutral-600" htmlFor="disease-add-advice">
            Zalecenia
          </label>
          <textarea
            id="disease-add-advice"
            className={cn(textareaStyles)}
            value={addDraft.advice ?? ""}
            onChange={(event) => setAddDraft((prev) => ({ ...prev, advice: event.target.value }))}
            maxLength={2000}
            aria-invalid={Boolean(addErrors?.fields?.advice)}
            aria-describedby={addErrors?.fields?.advice ? "disease-add-advice-error" : undefined}
          />
          {renderFieldError(addErrors?.fields?.advice, "disease-add-advice-error")}
        </div>
        <Button type="button" onClick={handleAdd} disabled={isAdding}>
          {isAdding ? "Dodawanie..." : "Dodaj chorobe"}
        </Button>
      </div>

      {!hasItems ? (
        <div className="rounded-lg border border-dashed border-neutral-200 p-4 text-sm text-neutral-500">
          Brak chorob. Dodaj pierwsza pozycje, aby uzupelnic dane.
        </div>
      ) : null}

      <div className="space-y-3">
        {items.map((item) => {
          const isDeleteArmed =
            item.deleteConfirm.armedAt && item.deleteConfirm.expiresAt && Date.now() < item.deleteConfirm.expiresAt;

          return (
            <details
              key={item.id}
              open={item.isOpen}
              onToggle={(event) => toggleOpen(item.id, (event.target as HTMLDetailsElement).open)}
              className="rounded-xl border border-neutral-200 bg-white p-4"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-neutral-800">
                <span>{item.data.name}</span>
                <span className="text-xs text-neutral-500">{item.mode === "edit" ? "Edycja" : "Podglad"}</span>
              </summary>

              <div className="mt-4 space-y-3">
                {item.mode === "read" ? (
                  <>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-neutral-500">Objawy</p>
                      <p className="whitespace-pre-wrap text-sm text-neutral-900">
                        {item.data.symptoms?.trim() ? item.data.symptoms : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-neutral-500">Zalecenia</p>
                      <p className="whitespace-pre-wrap text-sm text-neutral-900">
                        {item.data.advice?.trim() ? item.data.advice : "—"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => startEdit(item.id)}>
                        Edytuj
                      </Button>
                      <Button
                        type="button"
                        variant={isDeleteArmed ? "destructive" : "outline"}
                        onClick={() => requestDelete(item.id)}
                      >
                        {isDeleteArmed ? "Potwierdz usuniecie" : "Usun"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {item.errors?.form ? (
                      <div
                        className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                        role="alert"
                      >
                        {item.errors.form}
                      </div>
                    ) : null}
                    <div>
                      <label className="text-xs font-medium text-neutral-600" htmlFor={`disease-name-${item.id}`}>
                        Nazwa choroby *
                      </label>
                      <Input
                        id={`disease-name-${item.id}`}
                        value={item.draft.name}
                        onChange={(event) => updateDraft(item.id, { name: event.target.value })}
                        maxLength={50}
                        aria-invalid={Boolean(item.errors?.fields?.name)}
                        aria-describedby={item.errors?.fields?.name ? `disease-name-${item.id}-error` : undefined}
                      />
                      {renderFieldError(item.errors?.fields?.name, `disease-name-${item.id}-error`)}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-neutral-600" htmlFor={`disease-symptoms-${item.id}`}>
                        Objawy
                      </label>
                      <textarea
                        id={`disease-symptoms-${item.id}`}
                        className={cn(textareaStyles)}
                        value={item.draft.symptoms ?? ""}
                        onChange={(event) => updateDraft(item.id, { symptoms: event.target.value })}
                        maxLength={2000}
                        aria-invalid={Boolean(item.errors?.fields?.symptoms)}
                        aria-describedby={
                          item.errors?.fields?.symptoms ? `disease-symptoms-${item.id}-error` : undefined
                        }
                      />
                      {renderFieldError(item.errors?.fields?.symptoms, `disease-symptoms-${item.id}-error`)}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-neutral-600" htmlFor={`disease-advice-${item.id}`}>
                        Zalecenia
                      </label>
                      <textarea
                        id={`disease-advice-${item.id}`}
                        className={cn(textareaStyles)}
                        value={item.draft.advice ?? ""}
                        onChange={(event) => updateDraft(item.id, { advice: event.target.value })}
                        maxLength={2000}
                        aria-invalid={Boolean(item.errors?.fields?.advice)}
                        aria-describedby={item.errors?.fields?.advice ? `disease-advice-${item.id}-error` : undefined}
                      />
                      {renderFieldError(item.errors?.fields?.advice, `disease-advice-${item.id}-error`)}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        onClick={async () => {
                          const result = await save(item.id);
                          if (result.validation) {
                            toast.error("Popraw bledy w formularzu.");
                            return;
                          }
                          if (result.error) {
                            toast.error("Nie udalo sie zapisac zmian.");
                          } else {
                            toast.success("Zapisano chorobe.");
                          }
                        }}
                        disabled={item.isSaving}
                      >
                        {item.isSaving ? "Zapisywanie..." : "Zapisz"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => cancelEdit(item.id)}
                        disabled={item.isSaving}
                      >
                        Anuluj
                      </Button>
                      <Button
                        type="button"
                        variant={isDeleteArmed ? "destructive" : "outline"}
                        onClick={() => requestDelete(item.id)}
                        disabled={item.isSaving}
                      >
                        {isDeleteArmed ? "Potwierdz usuniecie" : "Usun"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
