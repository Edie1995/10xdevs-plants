# API Endpoint Implementation Plan: DELETE /api/plants/:id/diseases/:diseaseId

## 1. Przegląd punktu końcowego
Celem endpointu jest **usunięcie wpisu choroby** (`disease_entry`) przypisanego do konkretnej rośliny (`plant_card`) użytkownika.

- **Metoda HTTP**: `DELETE`
- **URL**: `/api/plants/:id/diseases/:diseaseId`
- **Zasób DB**: `disease_entry` (powiązany z `plant_card` przez `plant_card_id`)
- **Konwencja odpowiedzi**: wszystkie endpointy zwracają `ApiResponseDto<T>`; dla operacji usuwania zwracamy `message` oraz `data: null`.

## 2. Szczegóły żądania
- **Struktura URL**: `/api/plants/{id}/diseases/{diseaseId}`
- **Parametry**
  - **Wymagane (path params)**:
    - `id` (UUID) — identyfikator `plant_card`
    - `diseaseId` (UUID) — identyfikator `disease_entry`
  - **Opcjonalne**:
    - nagłówek `x-request-id` — do korelacji logów (już używane w innych endpointach)
- **Request Body**: brak (endpoint typu command)

## 3. Wykorzystywane typy
### DTO
- `ApiResponseDto<null>` — odpowiedź sukcesu z `message`
- `ApiErrorDto` — w przypadku błędów

### Command modele
- Brak dedykowanego command modelu (DELETE nie przyjmuje body).

### Typy pomocnicze (wewnętrzne)
- `ResourceNotFoundError` z `src/lib/services/diseases.service.ts` (już istnieje)
- Mapowanie błędów Supabase → `{ status, code, message, details? }` (konwencja już istnieje w endpointach `diseases`)

## 4. Szczegóły odpowiedzi
### Sukces
- **Status**: `200`
- **Body**:
  - `success: true`
  - `data: null`
  - `error: null`
  - `message`: np. `"Disease removed."`

Przykład:
```json
{
  "success": true,
  "data": null,
  "error": null,
  "message": "Disease removed."
}
```

### Błędy (format wspólny)
- `success: false`
- `data: null`
- `error: { code, message, details? }`

## 5. Przepływ danych
1. **Walidacja path params** przez Zod:
   - `id` i `diseaseId` muszą być UUID (`z.string().uuid()`).
   - przy błędzie walidacji: `400 invalid_id`.
2. **Wywołanie serwisu** `deleteDisease(supabase, userId, plantId, diseaseId)`:
   - `assertPlantOwnershipOrNotFound(...)` weryfikuje istnienie rośliny i jej własność (`plant_card.user_id`).
   - usunięcie rekordu w `disease_entry` ograniczone do `plant_card_id = plantId` i `id = diseaseId`.
   - jeśli brak rekordu do usunięcia: `ResourceNotFoundError("Disease not found.")`.
3. **Zwrócenie odpowiedzi** `200` z komunikatem sukcesu.
4. **Obsługa błędów**:
   - `ResourceNotFoundError` → `404` (roślina lub choroba)
   - błędy Supabase mapowane na `401/403/400/500` zgodnie z istniejącą konwencją
   - logowanie `console.error` z metadanymi (`route`, `plant_id`, `disease_id`, `request_id`, `error`)

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**:
  - Docelowo endpoint powinien działać dla zalogowanego użytkownika (Supabase Auth).
  - Aktualnie projekt używa `DEFAULT_USER_ID` (zgodnie z README); plan zakłada utrzymanie tej konwencji do czasu wdrożenia pełnej autentykacji.
- **Autoryzacja / izolacja danych**:
  - Usuwanie musi być możliwe wyłącznie w obrębie roślin należących do użytkownika:
    - sprawdzane w `assertPlantOwnershipOrNotFound` na `plant_card` (warunek `id` + `user_id`)
    - dodatkowo usuwanie w `disease_entry` ograniczone do `plant_card_id = plantId`
- **Ochrona przed wyciekiem informacji**:
  - W przypadku błędu `403/42501` z DB (RLS / brak dostępu) zwracamy `404 plant_not_found` (jak w istniejących endpointach), by nie ujawniać istnienia zasobu.
- **Walidacja wejścia**:
  - Jedynym wejściem są parametry ścieżki; walidacja UUID minimalizuje ryzyko nadużyć i błędów.

## 7. Obsługa błędów
Poniżej scenariusze błędów i oczekiwane statusy (zgodnie z wymaganiami projektu).

- **400 Bad Request**
  - `invalid_id`: `id` lub `diseaseId` nie jest UUID
  - `bad_request`: Supabase zwrócił błąd 400 (rzadkie w DELETE, ale zachować spójność mapowania)
- **401 Unauthorized**
  - `unauthorized`: brak/niepoprawna autoryzacja (Supabase zwróci 401)
- **404 Not Found**
  - `plant_not_found`: roślina nie istnieje lub nie należy do użytkownika
  - `disease_not_found`: choroba nie istnieje w ramach wskazanej rośliny
- **500 Server Error**
  - `server_error`: nieoczekiwany błąd Supabase lub błąd wykonania

Uwagi implementacyjne dot. mapowania:
- Jeśli `ResourceNotFoundError` pochodzi z weryfikacji rośliny → zwróć `404 plant_not_found`.
- Jeśli `ResourceNotFoundError` pochodzi z braku choroby → zwróć `404 disease_not_found`.
- Dla mapowania Supabase:
  - `401` → `401 unauthorized`
  - `403` lub `code === "42501"` → w odpowiedzi `404 plant_not_found` (zgodnie z obecną polityką ukrywania zasobów)
  - pozostałe → `500 server_error`

## 8. Wydajność
- Operacja to pojedynczy `SELECT` (weryfikacja własności rośliny) + `DELETE` po indeksowanym PK (`disease_entry.id`) z dodatkowym warunkiem `plant_card_id`.
- Wąskie gardła mało prawdopodobne; kluczowe jest utrzymanie minimalnych payloadów (DELETE zwraca tylko `message`).
- Rekomendacja: w `DELETE` użyć `select("id")` + `maybeSingle()` aby uniknąć dodatkowego zapytania “czy rekord istnieje” (jedno zapytanie i informacja o braku danych).

## 9. Kroki implementacji
1. **Dodać funkcję serwisową** w `src/lib/services/diseases.service.ts`:
   - `export const deleteDisease = async (supabase: SupabaseClient, userId: string, plantId: string, diseaseId: string): Promise<void> => { ... }`
   - kroki wewnątrz:
     - `await assertPlantOwnershipOrNotFound(supabase, userId, plantId);`
     - `const { data, error } = await supabase.from("disease_entry").delete().eq("id", diseaseId).eq("plant_card_id", plantId).select("id").maybeSingle();`
     - `if (error) throw error;`
     - `if (!data) throw new ResourceNotFoundError("Disease not found.");`
2. **Dodać handler `DELETE`** w istniejącym pliku route:
   - `src/pages/api/plants/[id]/diseases/[diseaseId].ts`
   - zachować konwencje:
     - `export const prerender = false;`
     - `paramsSchema` (już istnieje: `{ id, diseaseId }`)
     - wspólne helpery: `jsonResponse`, `errorResponse`, `mapSupabaseError`
   - implementacja `DELETE`:
     - walidacja `paramsSchema.safeParse(params)` → błąd `400 invalid_id`
     - `requestId` z nagłówka `x-request-id`
     - wywołanie `await deleteDisease(locals.supabase, DEFAULT_USER_ID, plantId, diseaseId)`
     - zwrot `200` z `ApiResponseDto<null>` i `message`
3. **Spójne logowanie błędów**:
   - `console.error("Failed to delete plant disease.", { route, plant_id, disease_id, request_id, error })`
4. **Scenariusze manual test (curl)**:
   - poprawne usunięcie → `200` i `success: true`
   - niepoprawne UUID → `400 invalid_id`
   - poprawne UUID, brak choroby → `404 disease_not_found`
   - poprawne UUID, brak rośliny użytkownika → `404 plant_not_found`
5. **Regresja kontraktu API**:
   - upewnić się, że response envelope jest zgodny z `ApiResponseDto<T>` (zawsze `success/data/error`, opcjonalnie `message`).

