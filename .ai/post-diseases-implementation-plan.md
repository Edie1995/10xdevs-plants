## API Endpoint Implementation Plan: `POST /api/plants/:id/diseases`

## 1. Przegląd punktu końcowego
Endpoint tworzy nowy wpis choroby (`disease_entry`) powiązany z rośliną (`plant_card`) o identyfikatorze `:id`.

- **Cel**: dodać chorobę (nazwa + opcjonalne objawy i zalecenia) dla konkretnej rośliny użytkownika.
- **Zasób DB**: `disease_entry` (FK: `plant_card_id -> plant_card.id`, ON DELETE CASCADE).
- **Wymagania architektoniczne**:
  - logika DB w `src/lib/services` (nie w samym route),
  - walidacja wejścia Zod w route,
  - użycie `locals.supabase` w route,
  - zwracanie odpowiedzi w spójnym formacie `ApiResponseDto<T>`.

## 2. Szczegóły żądania
- **Metoda HTTP**: `POST`
- **Struktura URL**: `/api/plants/:id/diseases`
- **Parametry**:
  - **Wymagane**:
    - `id` (path param) — UUID rośliny (`plant_card.id`)
  - **Opcjonalne**: brak
- **Nagłówki (zalecane)**:
  - `Content-Type: application/json`
  - `x-request-id` (opcjonalnie, do korelacji logów)
  - `Authorization: Bearer <token>` (jeśli/ gdy auth będzie aktywny)
- **Request Body** (JSON):
  - **Wymagane**:
    - `name`: string, max 50
  - **Opcjonalne**:
    - `symptoms`: string, max 2000
    - `advice`: string, max 2000

### Normalizacja danych wejściowych (rekomendowane)
- `name`: `trim()`, oraz wymagane `min(1)` po przycięciu.
- `symptoms`, `advice`: `trim()`, a pusty string zamienić na `null` (żeby nie przechowywać “pustych opisów”).

## 3. Wykorzystywane typy (DTO i Command modele)
Źródło: `src/types.ts`

- **Command model (request body)**:
  - `DiseaseCommand` — pasuje do payloadu (`name`, opcj. `symptoms`, opcj. `advice`) i nie zawiera pól kontrolowanych przez serwer (`id`, timestamps, `plant_card_id`).
- **DTO (response)**:
  - `DiseaseDto` — `disease_entry` bez `plant_card_id` (public-facing).
- **Envelope odpowiedzi**:
  - `ApiResponseDto<DiseaseDto>`

## 4. Szczegóły odpowiedzi
### Sukces
- **Status**: `201 Created`
- **Body**:
  - `success: true`
  - `data`: utworzony obiekt choroby (`DiseaseDto`)
  - `error: null`

Przykład (kontraktowy):

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Powiądnięte liście",
    "symptoms": "Opis…",
    "advice": "Zalecenia…",
    "created_at": "2026-01-29T12:34:56.000Z",
    "updated_at": "2026-01-29T12:34:56.000Z"
  },
  "error": null
}
```

### Błędy
Odpowiedzi błędów powinny być w formacie `ApiResponseDto<null>`:

- `success: false`
- `data: null`
- `error: { code, message, details? }`

## 5. Przepływ danych
### High-level flow
1. Route `POST /api/plants/:id/diseases`:
   - waliduje `params.id` (UUID),
   - parsuje i waliduje JSON body (Zod),
   - ustala `userId` (patrz “Względy bezpieczeństwa”),
   - wywołuje serwis `createDisease(...)`,
   - zwraca `201` i obiekt utworzonej choroby.
2. Service `src/lib/services/diseases.service.ts`:
   - sprawdza, czy `plant_card` istnieje i należy do użytkownika (ownership check),
   - wykonuje `INSERT` do `disease_entry` z `plant_card_id`,
   - zwraca rekord w formie `DiseaseDto` (bez `plant_card_id`).

### Operacje DB (rekomendowany kształt)
- Ownership check:
  - `select id from plant_card where id = :plantId and user_id = :userId`
  - brak rekordu → traktować jak `404`
- Insert:
  - `insert into disease_entry (plant_card_id, name, symptoms, advice) values (...)`
  - `select` po insercie powinien zwrócić co najmniej: `id, name, symptoms, advice, created_at, updated_at`

## 6. Względy bezpieczeństwa
### Uwierzytelnianie (401)
Docelowo endpoint powinien wymagać zalogowanego użytkownika:
- jeśli brak użytkownika (brak/niepoprawny token) → `401 unauthorized`.

Uwagi praktyczne dla obecnego repo:
- Obecne endpointy używają `DEFAULT_USER_ID` (prawdopodobnie tryb dev/MVP). Plan wdrożenia powinien:
  - **MVP**: zachować spójność i użyć `DEFAULT_USER_ID` jako `userId`,
  - **Docelowo**: zastąpić to rzeczywistym `userId` z Supabase Auth (np. `locals.supabase.auth.getUser()`), oraz oprzeć bezpieczeństwo na RLS.

### Autoryzacja/izolacja danych (404 zamiast 403)
Żeby uniknąć enumeracji zasobów:
- jeśli roślina nie istnieje **lub** nie należy do użytkownika → zwrócić `404 plant_not_found`.

### Walidacja i ochrona przed nadużyciami
- ograniczenia długości pól w Zod (50 / 2000) redukują ryzyko nadużyć (np. duże payloady),
- rozważyć limit rozmiaru body na poziomie infrastruktury (reverse proxy) lub aplikacji,
- logować `request_id` (jeśli dostarczony) i `plant_id` dla diagnostyki.

### SQL Injection / XSS
- Supabase client parametryzuje zapytania → brak klasycznego SQLi,
- dane tekstowe mogą być potem renderowane w UI → frontend powinien traktować je jako tekst (nie HTML).

## 7. Obsługa błędów
### Scenariusze błędów i kody statusu
- **400 invalid_id**: `params.id` nie jest UUID
  - `code`: `invalid_id`
  - `message`: “Plant id must be a valid UUID.”
  - `details`: wynik `zodError.flatten()`
- **400 invalid_body**: body nie jest poprawnym JSON lub nie spełnia schematu
  - `code`: `invalid_body`
  - `message`: “Invalid request body.”
  - `details`: `zodError.flatten()` lub informacja o błędzie parsowania JSON
- **401 unauthorized**: brak uwierzytelnienia (docelowo)
  - `code`: `unauthorized`
  - `message`: “Authentication required.”
- **404 plant_not_found**: roślina nie istnieje albo nie należy do użytkownika
  - `code`: `plant_not_found`
  - `message`: “Plant not found.”
- **500 server_error**: nieoczekiwany błąd po stronie serwera / błąd Supabase nieprzypisany do powyższych
  - `code`: `server_error`
  - `message`: “Unexpected server error.”

### Mapowanie błędów Supabase
Zachować spójność z istniejącym endpointem `GET`:
- mapować Supabase `401` → `401 unauthorized`
- mapować Supabase `403`/`42501` → **zwracać `404 plant_not_found`** (ukrywanie istnienia zasobu)
- mapować Supabase `400` → `400 bad_request` (z detale: `db_code`, `hint`)
- reszta → `500 server_error`

### Rejestrowanie błędów w tabeli błędów
W obecnym schemacie (wg `db-plan.md`) nie ma tabeli do logowania błędów — **nie dotyczy**.

Rekomendowane logowanie aplikacyjne:
- `console.error(...)` z kontekstem:
  - `route: "/api/plants/:id/diseases"`
  - `plant_id`
  - `request_id`
  - `error`

## 8. Wydajność
- Endpoint wykonuje maks. 2 operacje DB (ownership check + insert) — koszt stały, niski.
- Indeksy:
  - `plant_card.id` jest PK (OK),
  - rozważyć indeks na `plant_card.user_id` (częste filtrowanie),
  - `disease_entry.plant_card_id` warto mieć indeks (częste filtrowanie/łączenie).
- Zwracać tylko potrzebne pola po insercie (unikać `select *`).

## 9. Kroki implementacji
1. **Zdefiniuj schematy Zod w route** (`src/pages/api/plants/[id]/diseases.ts`):
   - `paramsSchema`: już istnieje (`id: uuid`)
   - `bodySchema`:
     - `name`: `z.string().trim().min(1).max(50)`
     - `symptoms`: `z.string().trim().max(2000).optional().transform(emptyToNull)`
     - `advice`: `z.string().trim().max(2000).optional().transform(emptyToNull)`
   - dodać obsługę błędu parsowania JSON (try/catch wokół `request.json()`).
2. **Dodaj handler `export const POST: APIRoute = ...`** w tym samym pliku co `GET`:
   - `export const prerender = false` pozostaje wspólne,
   - pobierz `requestId` z `x-request-id`,
   - wyznacz `userId`:
     - MVP: `DEFAULT_USER_ID` (spójnie z resztą),
     - docelowo: `locals.supabase.auth.getUser()` i `401` jeśli brak usera,
   - wywołaj `createDisease(locals.supabase, userId, plantId, command)`,
   - zwróć `201` z `ApiResponseDto<DiseaseDto>`.
3. **Rozszerz serwis** `src/lib/services/diseases.service.ts`:
   - dodać funkcję `createDisease(...)`:
     - wykonać `assertPlantOwnershipOrNotFound(...)`,
     - insert do `disease_entry`,
     - zwrócić `DiseaseDto` (bez `plant_card_id`), analogicznie do `listDiseases`.
4. **Ujednolić wybór pól zwracanych przez DB**:
   - dla POST zwrócić `id, name, symptoms, advice, created_at, updated_at`.
5. **Spójna obsługa błędów i logowanie**:
   - analogicznie do `GET`: mapowanie Supabase error → status i `ApiErrorDto`,
   - przy mapowaniu `403`/`42501` → zwracać `404 plant_not_found`.
6. **(Opcjonalnie) Testy kontraktowe / integracyjne**:
   - test `201`: poprawne body → utworzony rekord,
   - test `400`: nie-UUID id, brak name, name > 50, symptoms/advice > 2000, niepoprawny JSON,
   - test `404`: plantId nie istnieje / nie należy do usera,
   - test `401`: brak auth (gdy mechanizm auth zostanie włączony).
7. **Aktualizacja dokumentacji**:
   - dopisać do `README.md` lub `.ai/api-plan.md` przykład request/response i kody błędów (jeśli repo trzyma takie dokumenty aktualne).
