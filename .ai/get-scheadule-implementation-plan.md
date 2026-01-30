# API Endpoint Implementation Plan: GET /api/plants/:id/schedules

## 1. Przegląd punktu końcowego
Endpoint zwraca harmonogram sezonowy podlewania i nawożenia dla wskazanej rośliny (`plant_card`). Zgodnie ze specyfikacją musi zwrócić **4 wiersze** (dla `spring`, `summer`, `autumn`, `winter`) oraz posortować je w kolejności sezonów.

- **Metoda**: `GET`
- **URL**: `/api/plants/:id/schedules`
- **Autoryzacja**: wymagana (dostęp tylko do roślin należących do zalogowanego użytkownika)
- **Zasoby DB**: `seasonal_schedule`, powiązanie po `plant_card_id`

## 2. Szczegóły żądania
- **Parametry ścieżki**:
  - **Wymagane**:
    - `id` (UUID) – identyfikator `plant_card`
- **Query params**: brak
- **Request body**: brak

### Walidacja wejścia (Zod)
- `id`: `z.string().uuid()`
- Brak innych danych wejściowych.

## 3. Szczegóły odpowiedzi
### 200 OK (sukces odczytu)
Zwraca tablicę 4 elementów posortowaną w kolejności: `spring`, `summer`, `autumn`, `winter`.

- **Response DTO**: `ApiResponseDto<SeasonalScheduleDto[]>`
- **Kształt danych**: każdy element zawiera minimum:
  - `id`
  - `season`
  - `watering_interval`
  - `fertilizing_interval`
  - `created_at`
  - `updated_at`

### Przykładowa odpowiedź (schematycznie)
- `success: true`
- `data: SeasonalScheduleDto[]` (4 elementy)
- `error: null`

## 4. Wykorzystywane typy (DTO i modele)
### DTO
- `SeasonalScheduleDto` (z `src/types.ts`) – publiczny DTO harmonogramu (`Omit<SeasonalScheduleRow, "plant_card_id">`).
- `ApiResponseDto<T>` (z `src/types.ts`) – standardowa koperta odpowiedzi API.
- `ApiErrorDto` (z `src/types.ts`) – standard błędów API.
- `Season` (z `src/types.ts`) – typ enum sezonów.

### Command modele
Brak (endpoint tylko odczytu).

## 5. Przepływ danych
1. **Route**: `src/pages/api/plants/[id]/schedules.ts` implementuje `export const GET: APIRoute`.
2. **Walidacja**: parsowanie `params` przez Zod (`id` jako UUID). Błąd walidacji → `400`.
3. **Identyfikacja użytkownika**:
   - Docelowo: z sesji Supabase (JWT) w middleware/locals.
   - W obecnym stanie repo: wiele endpointów korzysta z `DEFAULT_USER_ID` jako placeholder (do czasu wdrożenia auth end-to-end).
4. **Service**:
   - Wywołanie funkcji serwisowej np. `getPlantSchedules(supabase, userId, plantId)`.
   - Serwis powinien wykonać **guard ownership**: sprawdzić, czy `plant_card(id, user_id)` istnieje dla danego `userId` (wzorować się na `assertPlantOwnershipOrNotFound` w `src/lib/services/plant-card.service.ts`).
5. **DB query**:
   - `select` z `seasonal_schedule` po `plant_card_id = plantId`.
   - Zwrócić kolumny: `id, season, watering_interval, fertilizing_interval, created_at, updated_at`.
   - Sortowanie: po `season` w kolejności enum (DB) lub jawnie po kolejności sezonów (patrz sekcja “Walidacja/Integralność danych”).
6. **Mapowanie**:
   - Ponieważ `SeasonalScheduleDto` jest `Omit<..., "plant_card_id">`, można zwrócić dane bez tej kolumny (nie selekcjonować jej w SQL).
7. **Odpowiedź**:
   - `200` z `ApiResponseDto` i `data` zawierającym posortowaną tablicę 4 elementów.

### Proponowana lokalizacja logiki
- **Preferowane**: dodać funkcję `getPlantSchedules(...)` w `src/lib/services/plant-card.service.ts` obok `updatePlantSchedules(...)` (współdzielony “ownership guard”, spójny kontekst domeny rośliny).
- **Alternatywa**: nowy serwis `src/lib/services/schedules.service.ts` (jeśli zespół chce rozdzielić odpowiedzialności), ale wtedy warto wydzielić `assertPlantOwnershipOrNotFound` do współdzielonego modułu.

## 6. Względy bezpieczeństwa
- **Uwierzytelnienie**:
  - Endpoint wymaga zalogowanego użytkownika; brak/niepoprawna sesja → `401`.
  - Zgodnie z zasadami projektu: korzystać z `locals.supabase` w route (nie importować klienta bezpośrednio).
- **Autoryzacja / Ownership**:
  - Sprawdzenie, czy `plant_card.id` należy do użytkownika (lub polegać na RLS + obsłużyć “403 → 404”).
  - Dla ochrony przed enumeracją zasobów: jeśli brak dostępu/roślina nie istnieje → **zwracać `404`** (“Plant not found.”), zgodnie z wzorcem z `src/pages/api/plants/[id].ts`.
- **Walidacja danych**:
  - UUID w ścieżce (zapobiega niezamierzonym/niepoprawnym query).
  - Brak danych body/query – mniejsza powierzchnia ataku.
- **Ryzyka**:
  - **IDOR** (Insecure Direct Object Reference) – mitigacja: ownership guard + RLS.
  - **Information leakage** – mitigacja: mapowanie `403` na `404`.
  - **Brak rate limiting** – możliwe nadużycia; rekomendacja: dodać limitowanie per-user (poza zakresem implementacji endpointu).

## 7. Obsługa błędów
### Scenariusze błędów i statusy
- **400 Bad Request**
  - niepoprawny `id` (nie-UUID) → kod np. `validation_error` lub `invalid_id`
  - szczegóły: `zodError.flatten()` jako `details`
- **401 Unauthorized**
  - brak sesji / brak identyfikatora użytkownika
  - kod: `unauthorized`
- **404 Not Found**
  - roślina nie istnieje lub użytkownik nie ma dostępu (maskowanie 403)
  - kod: `plant_not_found` lub `not_found` (zależnie od wzorca w pliku endpointu)
- **500 Internal Server Error**
  - nieoczekiwany błąd DB/Supabase
  - kod: `server_error`

### Logowanie błędów
W projekcie nie ma dedykowanej tabeli błędów. Stosować logowanie po stronie serwera:
- `console.error(...)` z metadanymi:
  - `route: "/api/plants/:id/schedules"`
  - `plant_id`
  - `user_id`
  - `request_id` (z nagłówka `x-request-id` jeśli obecny)
  - `error`

### Mapowanie błędów Supabase
Utrzymać spójność z istniejącymi endpointami:
- `status === 401` → `401 unauthorized`
- `status === 403` lub `code === "42501"` → zwrócić `404 plant_not_found` (maskowanie)
- `status === 400` → `400 bad_request` (rzadkie dla GET, ale zachować uniwersalne mapowanie)
- default → `500 server_error`

## 8. Wydajność
- Zapytanie dotyczy maks. 4 wierszy z `seasonal_schedule` → koszt minimalny.
- Zalecenia:
  - selekcjonować tylko potrzebne kolumny (bez `plant_card_id`)
  - używać pojedynczego zapytania do `seasonal_schedule` + lekkiego ownership guarda (1 dodatkowe query) lub polegać na RLS i obsłudze błędu dostępu.
  - sortowanie przenieść do DB (`order("season")`) lub wykonać jawny sort w pamięci (koszt pomijalny).

## 9. Kroki implementacji
1. **Route**
   - W pliku `src/pages/api/plants/[id]/schedules.ts` dodać handler `export const GET: APIRoute = async (...) => { ... }`.
   - Dodać `paramsSchema` (jeśli brak) i wspólne helpery `jsonResponse` / `errorResponse` (mogą być współdzielone z PUT w tym samym pliku).
2. **Walidacja**
   - `paramsSchema.safeParse(params)`; w razie błędu zwrócić `400`.
3. **Auth / userId**
   - Pobierać `userId` z mechanizmu autoryzacji projektu.
   - Tymczasowo (zgodnie z obecnym stanem repo) można użyć `DEFAULT_USER_ID`, ale zaplanować refactor na sesję Supabase.
4. **Service**
   - Dodać w `src/lib/services/plant-card.service.ts` funkcję:
     - `getPlantSchedules(supabase: SupabaseClient, userId: string, plantId: string): Promise<SeasonalScheduleDto[]>`
   - W serwisie:
     - `await assertPlantOwnershipOrNotFound(...)`
     - `select(...)` z `seasonal_schedule` po `plant_card_id`
     - `order("season", { ascending: true })`
5. **Porządek sezonów**
   - Upewnić się, że sortowanie spełnia wymaganie “season order”:
     - jeśli enum w DB ma kolejność `spring, summer, autumn, winter` (zgodnie z planem DB) – `order("season")` jest wystarczające,
     - dodatkowo (dla bezpieczeństwa) można wykonać jawny sort w kodzie wg tablicy `["spring","summer","autumn","winter"]`.
6. **Integralność danych (4 sezony)**
   - Po pobraniu danych sprawdzić, czy zwrócono 4 unikalne sezony.
   - Jeśli brakuje wierszy (np. roślina utworzona bez schedule), zdecydować i wdrożyć jedną ze strategii:
     - **Preferowane**: zwrócić `500 schedule_incomplete` + `details` z brakującymi sezonami (wymusza naprawę danych/flow tworzenia).
     - **Alternatywa** (jeśli produkt tego wymaga): doprecyzować w API i wypełniać brakujące sezony na etapie tworzenia rośliny (poza zakresem tego endpointu).
7. **Obsługa błędów**
   - Dodać `try/catch` w route.
   - `ResourceNotFoundError` → `404`.
   - Mapowanie błędów Supabase zgodnie ze wzorcami w repo, w tym `403 → 404`.
   - Logowanie `console.error` z metadanymi i `request_id`.
8. **Spójność odpowiedzi**
   - Zwracać `ApiResponseDto` (`success/data/error`) jak w pozostałych endpointach.
9. **Walidacja jakości**
   - Sprawdzić typy kompilacją TypeScript.
   - Dodać (opcjonalnie) test ręczny: wywołanie endpointu dla istniejącej rośliny z kompletnymi schedule i weryfikacja kolejności sezonów.
