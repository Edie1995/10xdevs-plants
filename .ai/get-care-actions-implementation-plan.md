# API Endpoint Implementation Plan: GET /api/plants/:id/care-actions

<analysis>
## 1) Kluczowe punkty specyfikacji API
- Endpoint zwraca **historię wykonanych akcji pielęgnacyjnych** dla pojedynczej rośliny (`plant_card`).
- Zwracane wpisy mają być **posortowane od najnowszych** (newest first).
- Możliwość filtrowania po typie akcji (`action_type`) oraz ograniczenia liczby rekordów (`limit`, domyślnie 50).
- Odpowiedzi powinny używać spójnej koperty `ApiResponseDto<T>` (zgodnie z `.ai/api-plan.md` i `src/types.ts`).

## 2) Parametry wymagane i opcjonalne
- Wymagane:
  - `:id` (path param) — identyfikator `plant_card.id` (UUID).
- Opcjonalne (query):
  - `action_type` — enum `care_action_type`: `watering | fertilizing`.
  - `limit` — liczba rekordów (domyślnie 50).

## 3) Niezbędne DTO i Command modele
- DTO:
  - `ApiResponseDto<T>` — koperta odpowiedzi.
  - `CareLogDto` — pojedynczy wpis logu (bez `plant_card_id`).
  - `CareActionsQueryDto` — query DTO (`action_type?`, `limit?`).
  - (Opcjonalnie) nowy typ: `CareActionsListResultDto = CareLogDto[]` lub alias na tablicę.
- Command modele:
  - Brak (endpoint tylko do odczytu).

## 4) Ekstrakcja logiki do service
- Utworzyć nowy serwis, np. `src/lib/services/care-actions.service.ts`:
  - `listCareActions(supabase, userId, plantId, query): Promise<CareLogDto[]>`
  - serwis odpowiada za:
    - weryfikację dostępu (własność rośliny),
    - budowę zapytania do `care_log`,
    - mapowanie wyniku na `CareLogDto[]` (bez `plant_card_id`),
    - sortowanie i limit.

## 5) Walidacja wejścia
- Zod w warstwie route (`src/pages/api/...`):
  - `id`: UUID.
  - `action_type`: enum `["watering", "fertilizing"]` (opcjonalny).
  - `limit`: int, min 1, **max (ustalić defensywnie)**, domyślnie 50 (np. 200).
- Walidacja semantyczna:
  - Jeżeli roślina o `id` nie istnieje lub nie należy do użytkownika → `404`.

## 6) Logowanie błędów do tabeli błędów
- W dostarczonych zasobach DB **brak tabeli błędów** — rejestrowanie błędów ograniczyć do:
  - `console.error(...)` w route (spójnie z `src/pages/api/plants.ts`),
  - opcjonalnie: rozszerzyć w przyszłości o dedykowaną tabelę/observability (poza zakresem tego endpointu).

## 7) Zagrożenia bezpieczeństwa
- **IDOR / wyciek danych**: dostęp do `care_log` innego użytkownika przez cudze `plant_card.id`.
  - Mitigacja: wymuszenie autoryzacji (401) + weryfikacja własności (404/403) oraz/lub RLS.
  - Uwaga: w repo jest migracja `disable_rls.sql`, więc nie zakładać wyłącznie RLS.
- **Nadużycia/DoS**: zbyt duże `limit` → ciężkie zapytania.
  - Mitigacja: limit max + indeksy + wybór tylko potrzebnych kolumn.
- **Brak sesji**: jeśli middleware nie weryfikuje JWT, endpoint może działać „anonimowo”.
  - Mitigacja: dopiąć pozyskanie `userId` z Supabase Auth (zgodnie z `.ai/api-plan.md`) lub jasno stosować `DEFAULT_USER_ID` tylko w DEV.

## 8) Scenariusze błędów i kody statusu
- `200`: poprawny odczyt (może zwrócić pustą tablicę, jeśli brak wpisów).
- `400`: błędne parametry (`id` nie-UUID, `limit` niepoprawny, `action_type` spoza enum).
- `401`: brak/niepoprawny token użytkownika.
- `404`: roślina nie istnieje lub nie należy do użytkownika (preferowane dla unikania enumeracji zasobów).
- `500`: nieoczekiwany błąd serwera / Supabase.
</analysis>

## 1. Przegląd punktu końcowego
- **Cel**: pobranie historii działań pielęgnacyjnych (`care_log`) dla wybranej rośliny (`plant_card`).
- **Zastosowanie w UI**: widok historii podlewania/nawożenia; możliwość filtrowania po typie akcji; domyślne ograniczenie do 50 ostatnich wpisów.
- **Zależności DB**:
  - `plant_card` — encja właścicielska (własność: `user_id`).
  - `care_log` — log działań (`action_type`, `performed_at`, `created_at`, `updated_at`, FK `plant_card_id`).

## 2. Szczegóły żądania
- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/plants/:id/care-actions`
- **Parametry**:
  - **Wymagane**:
    - `id` (path) — UUID rośliny (`plant_card.id`).
  - **Opcjonalne**:
    - `action_type` (query) — `watering | fertilizing`
    - `limit` (query) — int, domyślnie `50` (zalecane max: `200`)
- **Request Body**: brak
- **Nagłówki**:
  - `Authorization: Bearer <jwt>` (jeśli projekt docelowo egzekwuje auth zgodnie z `.ai/api-plan.md`)

## 3. Wykorzystywane typy
- **Query DTO**: `CareActionsQueryDto` (`src/types.ts`)
- **Response DTO**:
  - `ApiResponseDto<CareLogDto[]>` (koperta + tablica wpisów)
  - `CareLogDto` (`src/types.ts`) — rekord `care_log` bez `plant_card_id`
- **Modele DB**:
  - `care_log` (`CareLogRow` / `Tables<"care_log">`)
  - `plant_card` (`PlantCardRow` / `Tables<"plant_card">`)

## 4. Szczegóły odpowiedzi
- **200 OK** (sukces):
  - `success: true`
  - `data`: `CareLogDto[]` posortowane malejąco
  - `error: null`

Przykład (kształt):

```json
{
  "success": true,
  "data": [
    { "id": "uuid", "action_type": "watering", "performed_at": "2026-01-28", "created_at": "...", "updated_at": "..." }
  ],
  "error": null
}
```

- **Błędy** (koperta `ApiResponseDto<null>`):
  - `success: false`
  - `data: null`
  - `error: { code, message, details? }`

## 5. Przepływ danych
1. Route (Astro server endpoint) odbiera request, odczytuje `id` z params oraz query z `url.searchParams`.
2. Walidacja wejścia Zod:
   - `id` jako UUID,
   - `action_type` jako enum (opcjonalnie),
   - `limit` jako int (default 50, max defensywny).
3. Autoryzacja:
   - Ustalenie `userId` (docelowo z JWT / Supabase Auth; tymczasowo może istnieć `DEFAULT_USER_ID` dla DEV).
   - Weryfikacja własności rośliny: istnieje `plant_card` o `id` przypisane do `userId`.
4. Wywołanie serwisu `listCareActions(...)`:
   - Buduje query do `care_log`:
     - filtr `plant_card_id = id`,
     - opcjonalnie `action_type = ...`,
     - sort: `performed_at desc`, następnie `created_at desc`,
     - limit.
   - Mapuje rekordy do `CareLogDto[]` (pomija `plant_card_id`).
5. Zwrócenie odpowiedzi:
   - `200` z kopertą `ApiResponseDto<CareLogDto[]>`.
6. Obsługa wyjątków:
   - mapowanie błędów Supabase do spójnych kodów/komunikatów,
   - logowanie techniczne po stronie serwera.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**:
  - Docelowo wymagany token (zwracać `401` przy braku/niepoprawnym).
  - Implementacyjnie: route powinien korzystać z Supabase w `locals` (zgodnie z regułami) i/lub z danych ustawionych przez middleware.
- **Autoryzacja / własność zasobu**:
  - Nie polegać wyłącznie na RLS (w repo istnieje migracja wyłączająca RLS).
  - Jawnie sprawdzać, że `plant_card.user_id === userId`; przy braku dostępu zwrócić `404` (anty-enumeracja) lub `403` (jeśli polityka API preferuje rozróżnienie).
- **Walidacja i sanityzacja**:
  - Zod + limit max (ochrona przed nadużyciami).
  - Nie dopuszczać nieznanych wartości `action_type`.
- **Dane w logach**:
  - Logować kontekstowo (endpoint + plantId), bez danych wrażliwych; unikać dumpowania całych payloadów.

## 7. Obsługa błędów
Zalecane scenariusze i statusy (zgodnie z wymaganiami):
- **400**:
  - `id` nie jest UUID → `code: "validation_error"`
  - `limit` poza zakresem / nie-liczba → `code: "validation_error"`
  - `action_type` spoza enum → `code: "validation_error"`
- **401**:
  - brak/niepoprawny token → `code: "unauthorized"`
- **404**:
  - `plant_card` nie istnieje **lub** nie należy do użytkownika → `code: "not_found"`
- **500**:
  - błąd Supabase / nieoczekiwany wyjątek → `code: "server_error"`

Uwagi implementacyjne:
- Wzorować się na helperach `jsonResponse`/`errorResponse` i mapowaniu błędów z `src/pages/api/plants.ts`.
- Dla `404` (brak rośliny) błąd jest aplikacyjny (nie Supabase), więc powinien być obsłużony explicite przed query `care_log`.

## 8. Wydajność
- **Indeksy**: zakładać indeks po `care_log.plant_card_id` oraz (opcjonalnie) złożone po (`plant_card_id`, `action_type`, `performed_at`) zgodnie z `.ai/api-plan.md`.
- **Minimalny select**: wybierać tylko wymagane kolumny (co najmniej: `id`, `action_type`, `performed_at`, `created_at`, `updated_at`).
- **Limit**: domyślnie 50, max defensywny (np. 200) — zapobiega dużym payloadom i długim skanom.
- **Sortowanie**: sort po `performed_at` (date) i `created_at` dla deterministycznego porządku.

## 9. Kroki implementacji
1. **Route**: utworzyć plik `src/pages/api/plants/[id]/care-actions.ts`.
   - `export const prerender = false`
   - `export const GET: APIRoute = async ({ params, url, locals }) => { ... }`
2. **Walidacja Zod**:
   - schema dla `params.id` (UUID),
   - schema dla query (`action_type?`, `limit` z preprocess + default 50 + max).
3. **Ustalenie `userId`**:
   - Docelowo: z warstwy auth/middleware (zgodnie z planem w `.ai/api-plan.md`).
   - Tymczasowo (jeśli projekt tak działa dziś): użyć `DEFAULT_USER_ID` wyłącznie w DEV i zaplanować refaktor do auth.
4. **Service**: dodać `src/lib/services/care-actions.service.ts`.
   - `assertPlantOwnershipOrNotFound(supabase, userId, plantId)` (albo inline w `listCareActions`)
   - `listCareActions(supabase, userId, plantId, query)`:
     - sprawdza roślinę,
     - pobiera logi z filtrami, sortem, limitem,
     - mapuje do `CareLogDto[]`.
5. **Spójny format odpowiedzi**:
   - helper `jsonResponse`/`errorResponse` (skopiować wzorzec z `plants.ts` albo wydzielić wspólny helper w przyszłości).
6. **Mapowanie błędów**:
   - wykorzystać istniejący wzorzec `mapSupabaseError`,
   - dodać obsługę aplikacyjnego `404` dla braku rośliny.
7. **Testy (zalecane)**:
   - test walidacji query (400),
   - test `404` dla nieistniejącej rośliny,
   - test `200` z pustą tablicą,
   - test filtrowania `action_type` i sortowania.
8. **Weryfikacja bezpieczeństwa**:
   - upewnić się, że bez poprawnego `userId` endpoint nie zwraca danych,
   - upewnić się, że dla cudzej rośliny zwracane jest `404`.
