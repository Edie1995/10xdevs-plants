## API Endpoint Implementation Plan: `PUT /api/plants/:id/diseases/:diseaseId`

## <analysis>
### 1) Kluczowe punkty specyfikacji API
- Endpoint aktualizuje pojedynczą chorobę rośliny.
- URL zawiera dwa identyfikatory: rośliny (`:id`) oraz choroby (`:diseaseId`).
- Request jest zgodny z polami z `POST /api/plants/:id/diseases` (`name`, `symptoms`, `advice`), ale dla PUT traktujemy je jako **opcjonalne** (częściowa aktualizacja). Serwer powinien wymagać, aby **co najmniej jedno** z pól było podane.
- Response: **zaktualizowany wpis choroby** (w formacie spójnego envelope `ApiResponseDto<T>`).

### 2) Parametry wymagane i opcjonalne
- Wymagane (path):
  - `id`: UUID (`plant_card.id`)
  - `diseaseId`: UUID (`disease_entry.id`)
- Opcjonalne (query): brak
- Body:
  - Opcjonalne: `name` (string, ≤ 50, trim, min 1 po trim), `symptoms` (string ≤ 2000), `advice` (string ≤ 2000)
  - Reguła: **co najmniej jedno** z pól (`name`, `symptoms`, `advice`) musi zostać podane; w przeciwnym razie request powinien być odrzucony (`400`).
  - Normalizacja: `symptoms`/`advice` puste stringi → `null`

### 3) Niezbędne DTO i Command modele
Źródło: `src/types.ts`
- `DiseaseUpdateCommand` (nowy; payload dla PUT: pola opcjonalne, ale min. jedno wymagane na poziomie walidacji Zod)
- `DiseaseDto` (response; bez `plant_card_id`)
- `ApiResponseDto<DiseaseDto>`

### 4) Wyodrębnienie logiki do service
Istnieje `src/lib/services/diseases.service.ts` z:
- `assertPlantOwnershipOrNotFound(...)`
- `listDiseases(...)`
- `createDisease(...)`

Do PUT należy dodać nową funkcję serwisową np. `updateDisease(...)`, która:
- weryfikuje, że roślina należy do użytkownika,
- aktualizuje rekord `disease_entry` po `id` i `plant_card_id`,
- zwraca rekord jako `DiseaseDto` (bez `plant_card_id`),
- zwraca `404` jeśli nie znaleziono choroby w obrębie tej rośliny.

### 5) Walidacja danych wejściowych
- Walidacja path params Zod: oba UUID.
- Walidacja body Zod: **częściowa** (wszystkie pola opcjonalne) + walidacja “min. jedno pole”.
- Parsowanie JSON w try/catch: błąd → `400 invalid_body`.
- Normalizacja: `symptoms`/`advice` puste stringi → `null` (spójnie z DB kolumnami nullable).

### 6) Rejestrowanie błędów w tabeli błędów
W `db-plan.md` nie ma tabeli do logowania błędów — **nie dotyczy**.
Zastosować logowanie serwerowe (`console.error`) z kontekstem (route, request_id, plant_id, disease_id).

### 7) Potencjalne zagrożenia bezpieczeństwa
- IDOR (Insecure Direct Object Reference): próba aktualizacji choroby nie należącej do użytkownika → wymagane ownership-check + RLS.
- Enumeracja zasobów: nie ujawniać różnicy między “brak uprawnień” a “brak zasobu”; mapować `403`/`42501` Supabase do `404`.
- Nadmierne payloady: limity długości pól (Zod) + ewentualne limity rozmiaru body na warstwie infra.
- XSS: dane tekstowe będą renderowane w UI — traktować jako tekst, nie HTML.

### 8) Scenariusze błędów i kody statusu
- `200`: aktualizacja OK.
- `400`: nieprawidłowe params (UUID) lub body (JSON/Zod).
- `401`: brak autoryzacji (docelowo; zgodnie z middleware/auth).
- `404`: roślina nie istnieje / nie należy do użytkownika, albo choroba nie istnieje w obrębie tej rośliny.
- `500`: nieoczekiwany błąd serwera / nieobsłużony błąd Supabase.
## </analysis>

## 1. Przegląd punktu końcowego
Endpoint aktualizuje wpis choroby (`disease_entry`) przypisany do konkretnej rośliny (`plant_card`). Operacja jest ograniczona do zasobów użytkownika (autoryzacja per-plant).

- **Metoda**: `PUT`
- **URL**: `/api/plants/:id/diseases/:diseaseId`
- **Zasoby DB**:
  - `plant_card` (własność: `user_id`)
  - `disease_entry` (FK: `plant_card_id -> plant_card.id`)
- **Wymagania architektoniczne**:
  - walidacja wejścia Zod w route,
  - logika DB w `src/lib/services`,
  - użycie `locals.supabase` w route (bez globalnego klienta),
  - spójny envelope `ApiResponseDto<T>`.

## 2. Szczegóły żądania
- **Metoda HTTP**: `PUT`
- **Struktura URL**: `/api/plants/:id/diseases/:diseaseId`
- **Parametry**:
  - **Wymagane**:
    - `id` (path) — UUID rośliny (`plant_card.id`)
    - `diseaseId` (path) — UUID choroby (`disease_entry.id`)
  - **Opcjonalne**: brak
- **Nagłówki (zalecane)**:
  - `Content-Type: application/json`
  - `x-request-id` (opcjonalnie, do korelacji logów)
  - `Authorization: Bearer <token>` (jeżeli/ gdy auth jest aktywny)
- **Request Body (JSON)**: pola jak w POST, ale **wszystkie opcjonalne** (partial update)
  - `name`?: string, `trim()`, `min(1)`, `max(50)`
  - `symptoms`?: string, `trim()`, `max(2000)`; pusty string → `null`
  - `advice`?: string, `trim()`, `max(2000)`; pusty string → `null`
  - Wymaganie: body musi zawierać przynajmniej jedno z pól (`name` / `symptoms` / `advice`). Jeśli nie — **klient nie powinien wysyłać requestu**, a serwer zwraca `400 invalid_body`.

## 3. Szczegóły odpowiedzi
### Sukces
- **Status**: `200 OK`
- **Body**: `ApiResponseDto<DiseaseDto>`
  - `success: true`
  - `data`: zaktualizowany obiekt choroby (`DiseaseDto`)
  - `error: null`

Zakres pól `DiseaseDto` (z `src/types.ts`): `id, name, symptoms, advice, created_at, updated_at` (bez `plant_card_id`).

### Błędy
Wszystkie błędy w formacie `ApiResponseDto<null>`:
- `success: false`
- `data: null`
- `error: { code: string, message: string, details?: Json }`

## 4. Przepływ danych
### Route (Astro API)
Docelowy plik (routing Astro):
- `src/pages/api/plants/[id]/diseases/[diseaseId].ts` → `/api/plants/:id/diseases/:diseaseId`

Przepływ:
1. Walidacja `params` (`id`, `diseaseId`) schematem Zod (UUID).
2. Parsowanie JSON body w `try/catch` + walidacja Zod.
3. Ustalenie `userId`:
   - MVP (spójnie z obecnym kodem): `DEFAULT_USER_ID`,
   - docelowo: z sesji Supabase (np. `locals.supabase.auth.getUser()`), a brak usera → `401`.
4. Wywołanie serwisu `updateDisease(locals.supabase, userId, plantId, diseaseId, command)`.
5. Zwrócenie `200` z `ApiResponseDto<DiseaseDto>`.

### Service (`src/lib/services`)
Nowa funkcja `updateDisease(...)`:
1. `assertPlantOwnershipOrNotFound(...)`:
   - jeśli brak rośliny dla `(plantId, userId)` → `ResourceNotFoundError("Plant not found.")`
2. Update choroby:
   - `update disease_entry set name=?, symptoms=?, advice=? where id = :diseaseId and plant_card_id = :plantId`
   - `select id, name, symptoms, advice, created_at, updated_at`
3. Jeśli `data` puste → `ResourceNotFoundError("Disease not found.")` (status 404).
4. Mapowanie do `DiseaseDto` (bez `plant_card_id`).

Uwagi dot. spójności bezpieczeństwa:
- W route mapować błędy Supabase `403/42501` do `404`, aby nie ujawniać istnienia zasobów.

## 5. Względy bezpieczeństwa
- **Uwierzytelnianie**:
  - Docelowo wymagane; brak/niepoprawny token → `401`.
  - Aktualny stan repo (wzorzec): użycie `DEFAULT_USER_ID` jako `userId` (tryb dev/MVP).
- **Autoryzacja (IDOR)**:
  - Always check, że `plant_card.user_id === userId` zanim wykonasz update.
  - Dodatkowo ogranicz update: `where id = :diseaseId and plant_card_id = :plantId`.
- **RLS**:
  - `db-plan.md` zakłada RLS na `disease_entry` powiązany przez `plant_card.user_id = auth.uid()`. To powinno być docelową linią obrony.
- **Minimalizacja enumeracji**:
  - `403` z Supabase mapować do `404` (np. `plant_not_found`), spójnie z istniejącym `GET/POST`.
- **Walidacja i normalizacja**:
  - `name` obowiązkowe, `symptoms/advice` ograniczone i normalizowane do `null` gdy puste.

## 6. Obsługa błędów
### Mapowanie błędów (spójne z istniejącym `diseases.ts`)
- `400 invalid_id`: `id` lub `diseaseId` nie jest UUID
- `400 invalid_body`: body nie jest JSON lub nie spełnia schematu
- `401 unauthorized`: brak autentykacji (docelowo)
- `404 plant_not_found`: roślina nie istnieje lub brak dostępu
- `404 disease_not_found` (lub ogólne `not_found`): choroba nie istnieje dla tej rośliny
- `500 server_error`: nieoczekiwany błąd serwera

### Logowanie serwerowe
- `console.error("Failed to update plant disease.", { route, plant_id, disease_id, request_id, error })`
- Nie logować danych wrażliwych; payload może zawierać opisowe teksty (symptoms/advice).

## 7. Wydajność
- Stały koszt: 1–2 zapytania (ownership check + update/select).
- Wykorzystanie indeksów:
  - `plant_card.user_id` (weryfikacja własności),
  - `disease_entry.plant_card_id` (filtrowanie po roślinie),
  - `disease_entry.id` (PK).
- Zwracać wyłącznie wymagane kolumny w `select` po update (bez `plant_card_id`).

## 8. Kroki implementacji
1. **Utwórz nowy route plik** `src/pages/api/plants/[id]/diseases/[diseaseId].ts` z `export const prerender = false`.
2. **Zdefiniuj walidację Zod dla `params`**:
   - `id: z.string().uuid()`
   - `diseaseId: z.string().uuid()`
3. **Zdefiniuj schemat body** dla partial update:
   - `name`: `z.string().trim().min(1).max(50).optional()`
   - `symptoms`/`advice`: jak w POST (trim + max 2000 + transform empty→null), ale `.optional()`
   - dodaj walidację obiektu “min. jedno pole” (np. `refine`/`superRefine`), aby `{}` zwracało `400 invalid_body`.
4. **Dodaj handler `PUT`**:
   - `try/catch` dla `request.json()` → `400 invalid_body`,
   - `safeParse` dla params/body → `400` z `details`,
   - pobierz `requestId` z `x-request-id`,
   - ustal `userId` (MVP: `DEFAULT_USER_ID`, docelowo: z auth i `401` jeśli brak),
   - zmapuj wynik walidacji do `DiseaseUpdateCommand`,
   - wywołaj `updateDisease(locals.supabase, userId, plantId, diseaseId, command)`,
   - zwróć `200` z `ApiResponseDto<DiseaseDto>`.
5. **Rozszerz serwis `src/lib/services/diseases.service.ts`**:
   - dodaj `updateDisease(...)` (patrz sekcja Przepływ danych),
   - użyj istniejącego `assertPlantOwnershipOrNotFound(...)`,
   - na brak rekordu po update zwróć `ResourceNotFoundError("Disease not found.")`.
6. **Ujednolić obsługę błędów w route**:
   - analogicznie do `diseases.ts`: mapowanie błędów Supabase i logowanie,
   - mapować `403/42501` → `404` (nie ujawniać uprawnień).
7. **Test plan (minimum kontraktowe)**:
   - `200`: poprawne params i body → zwraca zaktualizowany rekord,
   - `400`: nie-UUID `id` lub `diseaseId`, niepoprawny JSON, `{}` (brak pól do aktualizacji), `name` pusty (jeśli podany), przekroczone limity długości,
   - `404`: roślina nie istnieje / nie należy do usera; choroba nie istnieje w ramach rośliny,
   - `401`: brak auth (po przełączeniu na realną autentykację).
