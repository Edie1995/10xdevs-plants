# API Endpoint Implementation Plan: GET /api/plants/:id

## 1. Przegląd punktu końcowego
Celem endpointu jest zwrócenie **pojedynczej karty rośliny** należącej do zalogowanego użytkownika wraz z:
- wpisami chorób (`diseases`)
- harmonogramami sezonowymi (`schedules`)
- najnowszymi wpisami w logu pielęgnacji (`recent_care_logs`, limit 5)

Endpoint działa w oparciu o **Supabase + RLS**: dostęp do danych jest ograniczony do rekordów, dla których `plant_card.user_id = auth.uid()`. Brak dostępu powinien być maskowany jako `404` (nie ujawniamy istnienia cudzych zasobów).

## 2. Szczegóły żądania
- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/plants/:id`
- **Parametry**:
  - **Wymagane**:
    - `id` (path param) — UUID identyfikujący rekord w `plant_card.id`
  - **Opcjonalne**: brak
- **Request body**: brak
- **Uwierzytelnianie**:
  - wymagane (JWT sesji Supabase, weryfikowane w `src/middleware/index.ts`)

## 3. Wykorzystywane typy
### DTO (istniejące w `src/types.ts`)
- `ApiResponseDto<T>`
- `ApiErrorDto`
- `PlantCardDetailDto` (docelowy kształt `data`)
- `DiseaseDto`
- `SeasonalScheduleDto`
- `CareLogDto`

### Command modele
Brak (endpoint tylko odczytu).

### Proponowane typy pomocnicze (opcjonalnie, lokalne dla serwisu)
- `GetPlantByIdParams`:
  - `plantId: string` (po walidacji UUID)
  - `recentCareLogsLimit: number` (stała = 5)

## 4. Szczegóły odpowiedzi
### Sukces — `200 OK`
Zwraca envelope zgodny z `ApiResponseDto<PlantCardDetailDto>`:
- `success: true`
- `data`: obiekt `PlantCardDetailDto`
- `error: null`

Struktura `data`:
- pola z `plant_card` (bez `user_id`)
- `diseases`: `DiseaseDto[]`
- `schedules`: `SeasonalScheduleDto[]`
- `recent_care_logs`: `CareLogDto[]` (max 5, posortowane od najnowszych)

### Błędy
Zwraca envelope zgodny z `ApiResponseDto<null>`:
- `success: false`
- `data: null`
- `error`: `{ code, message, details? }`

Kody statusu (zgodnie z wymaganiami):
- `400` — nieprawidłowy format `id`
- `401` — brak/niepoprawna sesja
- `404` — brak rośliny lub brak dostępu (RLS/ownership)
- `500` — błąd serwera / błąd Supabase

## 5. Przepływ danych
### High-level flow
1. **Middleware** weryfikuje sesję Supabase dla `/api/*` i udostępnia klienta przez `context.locals.supabase`.
2. Endpoint waliduje `id` (UUID) oraz ustala `recentCareLogsLimit = 5`.
3. Serwis pobiera dane z bazy:
   - `plant_card` dla `id`
   - powiązane `disease_entry`
   - powiązane `seasonal_schedule`
   - ostatnie 5 wpisów z `care_log` (dla `plant_card_id = id`, sort `performed_at desc` + `created_at desc`)
4. Serwis składa wynik do `PlantCardDetailDto`, pilnując, aby **nie zwrócić `user_id`**.
5. Endpoint zwraca `200` z envelope.

### Proponowany podział na warstwy
- **Endpoint**: `src/pages/api/plants/[id].ts`
  - tylko: walidacja wejścia, wywołanie serwisu, mapowanie błędów na statusy, formatowanie odpowiedzi
- **Serwis**: `src/lib/services/plants/getPlantDetail.service.ts` (nowy) lub rozszerzenie istniejącego `src/lib/services/plants.service.ts` (jeśli istnieje)
  - tylko: logika pobrania i złożenia danych z Supabase

### Zapytania do bazy (tabele z planu DB)
- `plant_card` (PK: `id`, RLS: `user_id = auth.uid()`)
- `disease_entry` (FK: `plant_card_id`, RLS via existence)
- `seasonal_schedule` (FK: `plant_card_id`, RLS via existence)
- `care_log` (FK: `plant_card_id`, RLS via existence)

Rekomendacja: **4 proste zapytania w `Promise.all`** zamiast złożonych zagnieżdżonych selectów, żeby:
- łatwo wymusić limit 5 na `care_log`
- uprościć aliasowanie pól do `diseases/schedules/recent_care_logs`
- ułatwić obsługę błędów i utrzymać typowanie

## 6. Względy bezpieczeństwa
- **AuthN**: endpoint wymaga poprawnej sesji; w przypadku braku tokenu — `401`.
- **AuthZ/RLS**:
  - nie wykonujemy ręcznych joinów “po user_id”; polegamy na RLS, ale **zachowujemy semantykę `404`** dla braku dostępu (żeby nie ujawniać istnienia cudzych rekordów).
- **Minimalizacja wycieku danych**:
  - nie zwracamy `plant_card.user_id` (DTO to `PlantCardPublicDto`)
  - preferujemy wybór konkretnych kolumn zamiast `*`
- **Walidacja wejścia**:
  - `id` musi być UUID (odrzucamy w `400`, zanim uderzymy w DB)
- **Brak dynamicznych filtrów**:
  - endpoint nie przyjmuje query stringów; minimalizuje powierzchnię ataku (np. injection przez parametry)
- **Rate limiting (przyszłościowo)**:
  - opcjonalnie dodać throttling per-user na `/api/*` (np. w middleware), jeśli endpoint będzie nadużywany

## 7. Obsługa błędów
### Mapowanie błędów na statusy i kody (przykładowe `error.code`)
- **400**:
  - `INVALID_ID` — `id` nie jest UUID
  - `VALIDATION_ERROR` — gdyby walidacja została rozszerzona
- **401**:
  - `UNAUTHORIZED` — brak sesji lub niepoprawny token
- **404**:
  - `PLANT_NOT_FOUND` — brak rekordu lub brak dostępu (RLS)
- **500**:
  - `SUPABASE_ERROR` — błąd zwrócony przez Supabase (np. connection, unexpected)
  - `INTERNAL_SERVER_ERROR` — błąd nieprzewidziany

### Scenariusze błędów (minimum)
- `id` ma zły format → `400`
- użytkownik niezalogowany → `401`
- roślina nie istnieje → `404`
- roślina istnieje, ale należy do innego użytkownika → `404` (RLS + maskowanie)
- błąd zapytania do Supabase → `500`

### Rejestrowanie błędów
W dostarczonym planie DB nie ma tabeli na logi błędów.
- **MVP**: logowanie na serwerze (console/error logger) z kontekstem:
  - `route`, `plant_id`, `request_id` (jeśli istnieje), `supabase_error`
- **Opcjonalnie** (jeśli projekt ma/otrzyma tabelę `error_log`): dodać zapis do DB w serwisie wspólnym do logowania błędów.

## 8. Wydajność
- **Limit danych**:
  - `recent_care_logs` max 5 (twardy limit w zapytaniu)
  - selekcja tylko potrzebnych kolumn
- **Indeksy** (z planu DB):
  - `plant_card`: index na `user_id` pomaga w RLS i filtrach
  - `disease_entry` / `seasonal_schedule`: index na `plant_card_id`
  - `care_log`: index na (`plant_card_id`, `action_type`, `performed_at`) i (`plant_card_id`, `performed_at`) — wspiera sort/limit
- **Równoległe zapytania**:
  - `Promise.all` dla diseases/schedules/care_log po potwierdzeniu, że plant istnieje (lub równolegle, jeśli i tak maskujemy 404; rekomendacja: najpierw `plant_card`, potem reszta, by ograniczyć liczbę zapytań w przypadku 404)

## 9. Kroki implementacji
1. **Zdefiniuj kontrakt endpointu** w `src/pages/api/plants/[id].ts`:
   - `export const prerender = false`
   - `export async function GET(context)` w uppercase
   - korzystaj z `context.locals.supabase` (nie importuj globalnego klienta)
2. **Walidacja wejścia (Zod)**:
   - schema dla `params.id` jako UUID
   - przy błędzie zwróć `400` z `ApiResponseDto<null>`
3. **Dodaj/uzupełnij serwis** w `src/lib/services/plants/`:
   - funkcja np. `getPlantDetail(supabase, plantId, { recentCareLogsLimit: 5 })`
   - zwraca `PlantCardDetailDto` albo sygnalizuje “not found”
4. **Implementacja pobierania danych**:
   - zapytanie do `plant_card` po `id`:
     - jeśli brak rekordu → `404`
   - zapytania do:
     - `disease_entry` po `plant_card_id`
     - `seasonal_schedule` po `plant_card_id`
     - `care_log` po `plant_card_id` z sortowaniem i limitem 5
5. **Składanie DTO**:
   - mapowanie DB rows do:
     - `PlantCardPublicDto` (bez `user_id`)
     - `DiseaseDto[]`, `SeasonalScheduleDto[]`, `CareLogDto[]`
   - zwróć `PlantCardDetailDto` z kluczami dokładnie: `diseases`, `schedules`, `recent_care_logs`
6. **Obsługa błędów Supabase**:
   - każdą `error` z Supabase mapuj na `500` (z bezpiecznym `message`)
   - loguj szczegóły w logach serwera (bez danych wrażliwych)
7. **Zwracanie odpowiedzi**:
   - sukces: `200` + `ApiResponseDto<PlantCardDetailDto>`
   - błędy: `400/401/404/500` + `ApiResponseDto<null>`
8. **Smoke testy manualne**:
   - nieautoryzowany request → `401`
   - request z nie-UUID `id` → `400`
   - request z poprawnym `id` rośliny użytkownika → `200` i `recent_care_logs.length <= 5`
   - request do cudzej rośliny (jeśli dostępne w środowisku testowym) → `404`

