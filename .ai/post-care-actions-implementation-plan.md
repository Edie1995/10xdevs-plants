## API Endpoint Implementation Plan: POST `/api/plants/:id/care-actions`

<analysis>
1. Kluczowe punkty specyfikacji API
- Endpoint służy do logowania wykonanej czynności pielęgnacyjnej (podlewanie / nawożenie), także z datą wsteczną.
- `performed_at` nie może być w przyszłości (≤ dzisiaj).
- Na podstawie `performed_at` wyznaczany jest sezon, a następnie pobierany jest interwał z `seasonal_schedule`.
- Aktualizowane są pola z prewyliczonymi terminami w `plant_card`: `last_*_at`, `next_*_at` oraz `status_priority`.
- `status_priority` ma semantykę: 0 = zaległe (overdue), 1 = dzisiaj, 2 = w przyszłości.
- Dla nawożenia, gdy `fertilizing_interval = 0`, endpoint ma zwrócić 400 z komunikatem „Fertilizing disabled for this season”.

2. Parametry wymagane i opcjonalne
- Path:
  - Wymagane: `id` (UUID plant_card)
- Body:
  - Wymagane: `action_type`: `"watering" | "fertilizing"` (ENUM `care_action_type`)
  - Opcjonalne: `performed_at`: `"YYYY-MM-DD"` (domyślnie „dzisiaj”)

3. Niezbędne typy DTO i Command modele
- Istniejące:
  - `CareActionCreateCommand` (request body command)
  - `CareActionResultDto` (wynik: `{ care_log, plant }`)
  - `ApiResponseDto<T>` (envelope)
  - `CareLogDto`, `PlantCardListItemDto`
- Do dodania (opcjonalnie, dla spójności z resztą API):
  - `CareActionCreateRequestDto` jako alias/ekwiwalent `CareActionCreateCommand` (jeśli zespół rozdziela DTO vs Command)

4. Wyodrębnienie logiki do service
- Endpoint powinien być cienki (parsowanie + walidacja + mapowanie błędów).
- Logika domenowa w `src/lib/services/care-actions.service.ts` jako nowa funkcja `createCareAction(...)`.
- Logika obliczeń sezonu i priorytetu jest już w `plant-card.service.ts` (wewnętrzne helpery). Żeby nie dublować, zalecane jest przeniesienie do współdzielonego modułu, np. `src/lib/services/care-schedule.utils.ts`.

5. Walidacja wejścia
- Zod:
  - `params.id` jako UUID.
  - `body.action_type` jako enum.
  - `body.performed_at`:
    - optional
    - format `YYYY-MM-DD`
    - parsowanie do daty UTC i walidacja `performed_at <= today` (porównanie po dacie, nie po czasie).
- Walidacje domenowe:
  - weryfikacja istnienia rośliny i ownership (user_id) → 404 jeśli brak.
  - dostępność `seasonal_schedule` dla wyliczonego sezonu:
    - jeśli brak rekordu, to 400 (konfiguracja rośliny niekompletna) z czytelnym kodem błędu.
  - dla nawożenia: `fertilizing_interval > 0`, inaczej 400 `"Fertilizing disabled for this season"`.

6. Rejestrowanie błędów w tabeli błędów
- W dostarczonym planie DB brak tabeli do logowania błędów aplikacyjnych.
- W warstwie endpointu logujemy do `console.error` (jak w istniejących endpointach).
- Jeśli zespół planuje trwałe logowanie, to osobne zadanie: dodać tabelę `api_error_log` + middleware/utility do zapisu (poza zakresem tego endpointu).

7. Ryzyka bezpieczeństwa
- Brak/niepoprawna autoryzacja: endpoint musi wymagać użytkownika; brak usera → 401.
- IDOR: weryfikacja ownership (`plant_card.user_id`) + RLS (docelowo) muszą blokować dostęp do cudzych zasobów.
- Walidacja dat: uniknięcie „future performed_at” i błędów stref czasowych (UTC i porównanie po dacie).
- Nadmiar informacji: dla braku ownership zwracać 404 („Plant not found”), nie 403.
- Nadużycia (spam logów): rozważyć limitowanie (rate limiting) na warstwie edge/proxy (poza kodem) lub przez prosty limit na użytkownika (opcjonalnie).

8. Scenariusze błędów i kody
- 400:
  - niepoprawne `id` (nie-UUID)
  - niepoprawne `action_type`
  - niepoprawny format `performed_at`
  - `performed_at` w przyszłości
  - brak `seasonal_schedule` dla sezonu
  - nawożenie wyłączone (`fertilizing_interval = 0`)
- 401:
  - brak zalogowanego użytkownika / brak sesji
- 404:
  - nie istnieje roślina o `id` lub nie należy do użytkownika
- 500:
  - błąd Supabase/Postgres lub nieoczekiwany wyjątek
</analysis>

## 1. Przegląd punktu końcowego
- **Cel**: Utworzenie wpisu w `care_log` (podlewanie/nawożenie) i natychmiastowa aktualizacja pól prewyliczonych w `plant_card` (`last_*_at`, `next_*_at`, `status_priority`) na podstawie sezonowego harmonogramu.
- **Metoda**: `POST`
- **URL**: `/api/plants/:id/care-actions`
- **Prerender**: `export const prerender = false`
- **Warstwa logiki**: endpoint (routing + walidacja) + serwis (`src/lib/services/care-actions.service.ts`)

## 2. Szczegóły żądania
- **Path params**:
  - **Wymagane**: `id: string (uuid)` — identyfikator `plant_card`.
- **Request body (JSON)**:
  - **Wymagane**:
    - `action_type: "watering" | "fertilizing"`
  - **Opcjonalne**:
    - `performed_at: "YYYY-MM-DD"` — domyślnie dzisiaj (UTC); musi spełniać \(performed\_at \le today\).
- **Nagłówki**:
  - `Content-Type: application/json`
  - **Autoryzacja**: docelowo sesja Supabase (cookie / header zależnie od wdrożonego SSR auth).

## 3. Wykorzystywane typy
- **Istniejące w `src/types.ts`**:
  - `CareActionCreateCommand` — model wejściowy (body).
  - `CareActionResultDto` — model wyjściowy: `{ care_log: CareLogDto; plant: PlantCardListItemDto }`.
  - `ApiResponseDto<T>` — envelope odpowiedzi.
  - `CareActionType`, `Season`.
- **Sugestia** (opcjonalnie):
  - `CareActionCreateRequestDto = CareActionCreateCommand` jeśli zespół chce jawnie nazwać DTO requestu.

## 4. Szczegóły odpowiedzi
- **201 Created** (sukces):
  - Envelope: `ApiResponseDto<CareActionResultDto>`
  - `data.care_log`: utworzony rekord `care_log` (bez `plant_card_id`).
  - `data.plant`: zaktualizowany „list item” rośliny (pola zgodne z `PlantCardListItemDto`, w szczególności `last_*_at`, `next_*_at`, `status_priority`).
- **400 Bad Request**:
  - Envelope: `ApiResponseDto<null>`
  - `error.code`: np. `validation_error`, `fertilizing_disabled`, `schedule_missing`, `performed_at_in_future`
- **401 Unauthorized**:
  - Envelope: `ApiResponseDto<null>`
  - `error.code`: `unauthorized`
- **404 Not Found**:
  - Envelope: `ApiResponseDto<null>`
  - `error.code`: `not_found` (np. `"Plant not found."`)
- **500 Server Error**:
  - Envelope: `ApiResponseDto<null>`
  - `error.code`: `server_error`

## 5. Przepływ danych
1. **Routing**: `src/pages/api/plants/[id]/care-actions.ts` dodaje handler `POST`.
2. **Walidacja**:
   - `params.id` (UUID)
   - `body.action_type`, `body.performed_at` (format i reguła ≤ today)
3. **Autoryzacja**:
   - Pobranie użytkownika (docelowo `locals.supabase.auth.getUser()` lub analogiczne SSR).
   - Brak usera → 401.
4. **Serwis** (`createCareAction`):
   - Sprawdza ownership rośliny (jak `assertPlantOwnershipOrNotFound`) → 404 jeśli brak.
   - Ustala `effectivePerformedAt`:
     - jeśli `performed_at` brak → dzisiejsza data (UTC, `YYYY-MM-DD`)
   - Wyznacza sezon na podstawie `effectivePerformedAt`:
     - mapowanie miesięcy jak w `plant-card.service.ts` (UTC month).
   - Pobiera rekord `seasonal_schedule` dla `(plant_card_id, season)`:
     - jeśli brak → 400.
   - Wylicza interwał:
     - dla `watering`: `watering_interval`
     - dla `fertilizing`: `fertilizing_interval`, ale jeśli 0 → 400 `"Fertilizing disabled for this season"`.
   - Wstawia rekord `care_log` (`plant_card_id`, `action_type`, `performed_at`).
   - Aktualizuje `plant_card`:
     - `last_watered_at` lub `last_fertilized_at` ustawione na `effectivePerformedAt` (jako `timestamptz`, np. `YYYY-MM-DDT00:00:00.000Z`).
     - `next_watering_at` / `next_fertilizing_at`:
       - `performed_at + interval` w UTC, zapis w `timestamptz`.
     - `status_priority` liczony **po dacie** (nie po czasie):
       - 0 jeśli nearest(next_*) < today
       - 1 jeśli nearest(next_*) == today
       - 2 jeśli nearest(next_*) > today
   - Zwraca `{ care_log, plant }`.
5. **Odpowiedź**: endpoint mapuje wynik do `ApiResponseDto` i zwraca 201.

### Uwagi o spójności / atomowości
- Operacja składa się z co najmniej 2 zapisów (insert `care_log` + update `plant_card`). Przy równoległych requestach może dojść do niespójności.
- **Rekomendacja (docelowo)**: zrobić to atomowo jako funkcję Postgres (RPC), np. `log_care_action(plant_id uuid, action care_action_type, performed_at date)`:
  - waliduje ownership (przez RLS lub explicit check),
  - pobiera schedule,
  - tworzy log,
  - aktualizuje plant,
  - zwraca wynik.
- **Wersja MVP**: sekwencja operacji w serwisie + defensywne sprawdzanie błędów; akceptujemy ryzyko race-condition do czasu wdrożenia RPC.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**: wymagane; brak usera → 401.
- **Autoryzacja/IDOR**:
  - serwis zawsze sprawdza ownership (`plant_card.user_id == auth.uid()/userId`).
  - zwracamy 404 dla roślin spoza konta (nie ujawniamy istnienia).
  - docelowo wspieramy RLS zgodnie z `db-plan.md`.
- **Walidacja danych wejściowych**:
  - zod + reguły domenowe.
  - ścisłe parsowanie daty `YYYY-MM-DD` i porównanie w UTC po dacie.
- **Ekspozycja informacji**:
  - błędy DB mapujemy do generycznych 500, a szczegóły (db_code/hint) tylko w `details` jeśli to bezpieczne.

## 7. Obsługa błędów
- **400**:
  - invalid `id` / invalid JSON body
  - invalid `performed_at` (format / nieparsowalne)
  - `performed_at` w przyszłości
  - brak `seasonal_schedule` dla wyliczonego sezonu
  - `fertilizing_interval = 0` (nawożenie wyłączone)
- **401**:
  - brak sesji użytkownika
- **404**:
  - roślina nie istnieje lub nie należy do użytkownika
- **500**:
  - błąd Supabase, błąd połączenia, nieoczekiwany wyjątek
- **Logowanie**:
  - w catch: `console.error("Failed to create care action.", error)` (spójnie z istniejącymi endpointami).

## 8. Wydajność
- Query pattern:
  - 1x select ownership (lub łącznie z select schedule)
  - 1x select schedule (dla sezonu)
  - 1x insert care_log
  - 1x update plant_card (+ ewentualny select do odpowiedzi)
- Indeksy wspierające:
  - `care_log (plant_card_id, performed_at)` / `(plant_card_id, action_type, performed_at)`
  - `seasonal_schedule (plant_card_id)` + unique `(plant_card_id, season)`
- Optymalizacja odpowiedzi:
  - Zwracać tylko potrzebne kolumny `PlantCardListItemDto` i `CareLogDto` (jak w innych serwisach).

## 9. Kroki implementacji
1. **Ustalić źródło `userId`**:
   - Docelowo: user z Supabase Auth (401 jeśli brak).
   - Tymczasowo (jeśli projekt nadal używa placeholdera): `DEFAULT_USER_ID` jak w istniejących endpointach, ale oznaczyć jako TODO i przygotować punkt pod łatwą wymianę.
2. **Zaimplementować walidację w route** (`src/pages/api/plants/[id]/care-actions.ts`):
   - dodać `bodySchema` dla `CareActionCreateCommand` (z refinements dla `performed_at`).
   - dodać handler `POST`.
3. **Rozszerzyć serwis** (`src/lib/services/care-actions.service.ts`):
   - dodać `createCareAction(supabase, userId, plantId, command): Promise<CareActionResultDto>`.
   - użyć istniejącego `assertPlantOwnershipOrNotFound`.
4. **Wydzielić (lub skopiować w MVP) helpery dat/priorytetu**:
   - Preferowane: utworzyć `src/lib/services/care-schedule.utils.ts` i przenieść:
     - `getSeasonForDate(date): Season` (UTC month)
     - `addDaysUtc(date, days): Date`
     - `compareUtcDateOnly(a, b)` / `isSameUtcDate`
     - `computeStatusPriority(nearestNextDate, today)` w oparciu o porównanie po dacie (zgodnie ze specyfikacją: overdue/today/future).
   - Następnie użyć tego zarówno w `plant-card.service.ts`, jak i w `care-actions.service.ts` (uniknięcie dublowania logiki).
5. **Obsłużyć reguły domenowe**:
   - `performed_at <= today` (400)
   - brak schedule (400)
   - `fertilizing_interval = 0` (400 z wymaganym komunikatem)
6. **Zbudować spójne mapowanie odpowiedzi i błędów**:
   - Sukces → `201` i `ApiResponseDto<CareActionResultDto>`.
   - Walidacja → `400` i `ApiResponseDto<null>` z `validation_error`.
   - Not found → `404` (`ResourceNotFoundError`).
   - Nieautoryzowany → `401`.
   - Reszta → `500`.
7. **(Opcjonalnie) Zaplanować atomowość**:
   - jeśli wymagane przez produkt: dodać funkcję Postgres/RPC, a serwis przełączyć na `supabase.rpc(...)`.
8. **Testy / weryfikacja ręczna**:
   - Logowanie podlewania „dzisiaj” → 201, `next_watering_at` = today + interval, `status_priority` poprawny.
   - Logowanie z `performed_at` w przyszłości → 400.
   - Logowanie nawożenia przy `fertilizing_interval = 0` → 400 `"Fertilizing disabled for this season"`.
   - Brak rośliny / roślina innego usera → 404.
   - Brak schedule dla sezonu → 400.
