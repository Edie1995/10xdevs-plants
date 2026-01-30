# API Endpoint Implementation Plan: DELETE `/api/plants/:id`

## <analysis>
### 1) Kluczowe punkty specyfikacji API
- Endpoint usuwa roślinę (`plant_card`) wskazaną przez `:id`.
- Usunięcie ma **kaskadować** do zasobów zależnych: `disease_entry`, `seasonal_schedule`, `care_log`.
- Oczekiwana odpowiedź sukcesu: `{ "success": true, "data": null, "message": "Plant deleted" }`.

### 2) Wymagane i opcjonalne parametry
- **Wymagane**:
  - Parametr ścieżki `id`: UUID rośliny.
- **Opcjonalne**: brak.
- **Request body**: brak.

### 3) Niezbędne DTO i Command modele
- DTO (istniejące): `ApiResponseDto<T>` z `src/types.ts`.
- DTO (do rozważenia dla zgodności ze specyfikacją):
  - dodać do `ApiResponseDto<T>` opcjonalne pole `message?: string` (wstecznie kompatybilne),
  - albo wprowadzić osobny typ sukcesu dla operacji „command” (np. `ApiCommandResponseDto<T>`) z `message`.
- Command modele: brak (DELETE bez body); walidacja dotyczy tylko parametrów ścieżki.

### 4) Ekstrakcja logiki do serwisu
- Dodać nową funkcję serwisową w `src/lib/services/plant-card.service.ts`, np. `deletePlantCard(...)`, aby:
  - trzymać logikę usuwania w warstwie usług,
  - ujednolicić zachowanie „not found vs forbidden” z resztą API (nie ujawniać istnienia zasobu).

### 5) Walidacja wejścia
- Zod:
  - `id`: `z.string().uuid()`.
- Brak body → brak walidacji payloadu.
- Spójność z DB planem:
  - roślina jest identyfikowana po `plant_card.id` (UUID),
  - kaskada jest realizowana przez FK `ON DELETE CASCADE` (nie kasujemy dzieci ręcznie w aplikacji).

### 6) Rejestrowanie błędów w tabeli błędów
- W dostarczonym `db-plan.md` nie ma tabeli błędów/logów aplikacyjnych.
- Minimalnie: logować `console.error(...)` z kontekstem (route, plant_id, request_id, user_id, supabase error).
- Jeśli w przyszłości pojawi się tabela błędów: dodać w serwisie opcjonalne `logError(...)` (best-effort, nie blokuje odpowiedzi).

### 7) Ryzyka bezpieczeństwa
- **Autoryzacja**: nie dopuścić do usunięcia rośliny innego użytkownika (RLS + filtr `user_id`).
- **Wycieki informacji**: dla braku dostępu (RLS 403) zwrócić 404 („Plant not found”) jak w `GET /api/plants/:id`.
- **CSRF**: jeśli API używa cookies, rozważyć ochronę; jeśli Bearer token w `Authorization`, ryzyko CSRF jest mniejsze.
- **Nadużycia**: DELETE jest destrukcyjny — rozważyć ograniczenia (rate limit) w przyszłości.

### 8) Scenariusze błędów i statusy
Zgodnie z wymaganymi kodami:
- **200**: sukces (usunięto).
- **400**: niepoprawny UUID w `:id`.
- **401**: brak/niepoprawna autentykacja (jeśli wymuszamy auth).
- **404**: roślina nie istnieje lub nie należy do użytkownika (maskowanie 403).
- **500**: nieoczekiwany błąd serwera / błąd Supabase.
## </analysis>

## 1. Przegląd punktu końcowego
Endpoint usuwa zasób rośliny (`plant_card`) o podanym `id`. Usunięcie powinno spowodować automatyczne usunięcie rekordów zależnych (`disease_entry`, `seasonal_schedule`, `care_log`) dzięki relacjom FK z `ON DELETE CASCADE` (zgodnie z `db-plan.md`).

## 2. Szczegóły żądania
- Metoda HTTP: **DELETE**
- Struktura URL: **`/api/plants/:id`**
- Parametry:
  - Wymagane:
    - `id` (UUID) — identyfikator `plant_card`.
  - Opcjonalne: brak
- Request Body: brak
- Nagłówki:
  - `Authorization: Bearer <token>` (jeśli warstwa auth jest aktywna)
  - `x-request-id` (opcjonalnie; do korelacji logów)

## 3. Wykorzystywane typy
- `ApiResponseDto<null>` z `src/types.ts` (envelope odpowiedzi).
- **Rekomendacja dot. zgodności ze specyfikacją**:
  - dodać `message?: string` do `ApiResponseDto<T>` (aby DELETE mógł zwracać `"Plant deleted"` bez wprowadzania osobnego typu),
  - utrzymać dotychczasowe odpowiedzi endpointów bez zmian (pole opcjonalne).

## 4. Szczegóły odpowiedzi
### 4.1. Sukces
- Status: **200 OK**
- Body (zgodnie ze specyfikacją):

```json
{
  "success": true,
  "data": null,
  "message": "Plant deleted",
  "error": null
}
```

> Uwaga: obecne endpointy nie zwracają `message`. Aby zachować spójność, plan zakłada dodanie `message?: string` w DTO lub doprecyzowanie, że message jest opcjonalne tylko dla operacji typu DELETE.

### 4.2. Błędy
- Status: **400 Bad Request** — niepoprawny `id` (nie jest UUID).
- Status: **401 Unauthorized** — brak/niepoprawny token (jeśli auth włączony).
- Status: **404 Not Found** — roślina nie istnieje **albo** nie należy do użytkownika (nie ujawniamy istnienia).
- Status: **500 Internal Server Error** — błąd nieoczekiwany.

## 5. Przepływ danych
1. Handler `DELETE` w `src/pages/api/plants/[id].ts` parsuje `params` i waliduje `id` (Zod).
2. Ustalenie `userId`:
   - docelowo z kontekstu sesji Supabase (auth),
   - tymczasowo (jak w istniejącym kodzie) może być używany `DEFAULT_USER_ID`, ale plan rekomenduje przejście na auth ASAP.
3. Wywołanie serwisu `deletePlantCard(locals.supabase, userId, plantId)`.
4. Serwis wykonuje pojedynczą operację usunięcia:
   - `DELETE FROM plant_card WHERE id = :plantId AND user_id = :userId`
   - z `.select("id")` aby móc rozpoznać „0 usuniętych” → 404.
5. FK `ON DELETE CASCADE` usuwa rekordy zależne w `disease_entry`, `seasonal_schedule`, `care_log`.
6. Handler zwraca 200 + envelope zgodny ze specyfikacją.

## 6. Względy bezpieczeństwa
- **Autentykacja (401)**:
  - jeżeli brak sesji/tokena → 401.
- **Autoryzacja (maskowanie braku dostępu)**:
  - jeżeli user nie jest właścicielem, RLS może zwrócić 403; handler powinien zmapować to na 404 („Plant not found”) analogicznie do `GET /api/plants/:id`.
- **Minimalizacja wycieków**:
  - nie zwracać informacji, czy zasób istnieje dla innego użytkownika.
- **Destrukcyjność**:
  - rozważyć w przyszłości „soft delete” lub audit log; na teraz zgodnie ze specyfikacją jest hard delete.

## 7. Obsługa błędów
### 7.1. Walidacja
- Jeśli `params.id` nie przejdzie `z.string().uuid()`:
  - zwrócić **400** z kodem np. `invalid_id` lub `validation_error`.

### 7.2. Not found / brak dostępu
- Jeśli usunięcie nie zwróci żadnego rekordu (`data` puste) → **404** `plant_not_found`.
- Jeśli Supabase zwróci 403/RLS (`status === 403` lub `code === "42501"`) → **404** `plant_not_found`.

### 7.3. Unauthorized
- Jeśli Supabase wskaże brak autoryzacji (`status === 401`) → **401** `unauthorized`.

### 7.4. Server error
- Każdy inny przypadek → **500** `server_error`.
- Logowanie:
  - `console.error("Failed to delete plant card.", { route, plant_id, user_id, request_id, error })`.

## 8. Wydajność
- Operacja bazuje na pojedynczym `DELETE` po PK + indeks `user_id`/warunek `user_id`:
  - koszt stały, zależny głównie od liczby rekordów zależnych usuwanych kaskadowo.
- Kaskada usuwa zależne rekordy bez dodatkowych rundtripów aplikacji.
- Zalecenie: zwracać minimalny payload (null + message), bez pobierania relacji.

## 9. Kroki implementacji
1. **Routing**
   - Dodać handler `export const DELETE: APIRoute = ...` w `src/pages/api/plants/[id].ts` (ten plik już obsługuje `GET` i `PUT` dla tego samego zasobu).
   - Ustawić `export const prerender = false` (już ustawione).
2. **Walidacja**
   - Użyć istniejącego `paramsSchema` (`id: z.string().uuid()`).
   - W razie błędu zwrócić 400 w standardowym envelope.
3. **DTO / response envelope**
   - Dostosować `ApiResponseDto<T>` w `src/types.ts`:
     - dodać `message?: string` (opcjonalne).
   - Zwracać w DELETE: `{ success: true, data: null, error: null, message: "Plant deleted" }`.
4. **Serwis**
   - Dodać funkcję w `src/lib/services/plant-card.service.ts`:
     - `deletePlantCard(supabase: SupabaseClient, userId: string, plantId: string): Promise<void>`
     - Wykonać delete z filtrami `id` + `user_id`, użyć `.select("id").maybeSingle()` (lub równoważnie sprawdzić liczbę usuniętych).
     - Jeśli brak danych → rzucić `ResourceNotFoundError("Plant not found.")`.
5. **Autoryzacja**
   - Docelowo pobierać `userId` z `DEFAULT_USER_ID`.
6. **Mapowanie błędów**
   - Użyć wzorca z `GET /api/plants/:id`:
     - 403 → 404 `plant_not_found`
     - 401 → 401 `unauthorized`
     - pozostałe → 500 `server_error`
7. **Logowanie**
   - Dodać `requestId = request.headers.get("x-request-id") ?? undefined`.
   - Logować kontekstowo w catch (bez danych wrażliwych).
8. **Testy / weryfikacja (manualna)**
   - DELETE z poprawnym `id` istniejącej rośliny → 200 i `message`.
   - DELETE z niepoprawnym UUID → 400.
   - DELETE `id` nieistniejącego → 404.
   - DELETE `id` istniejącego, ale należącego do innego usera → 404.
   - Po usunięciu sprawdzić, że `disease_entry`, `seasonal_schedule`, `care_log` dla `plant_card_id` nie istnieją (kaskada).
