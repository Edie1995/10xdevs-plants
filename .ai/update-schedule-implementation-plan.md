## API Endpoint Implementation Plan: `PUT /api/plants/:id/schedules`

## 1. Przegląd punktu końcowego
Endpoint służy do **atomowej (z perspektywy API) aktualizacji kompletu harmonogramów sezonowych** dla wybranej rośliny (`plant_card`). Klient przesyła pełną listę 4 wpisów (po jednym na sezon). Serwer waliduje kompletność danych, sprawdza dostęp użytkownika do rośliny, zapisuje harmonogramy w tabeli `seasonal_schedule` oraz zwraca aktualny stan harmonogramów z timestampami.

## 2. Szczegóły żądania
- **Metoda HTTP**: `PUT`
- **Struktura URL**: `/api/plants/:id/schedules`
- **Parametry**:
  - **Wymagane (path)**:
    - **`id`**: UUID rośliny (`plant_card.id`)
- **Request Body**: `application/json`

```json
{
  "schedules": [
    { "season": "winter", "watering_interval": 10, "fertilizing_interval": 0 },
    { "season": "spring", "watering_interval": 7, "fertilizing_interval": 30 },
    { "season": "summer", "watering_interval": 5, "fertilizing_interval": 21 },
    { "season": "autumn", "watering_interval": 9, "fertilizing_interval": 0 }
  ]
}
```

- **Reguły walidacji**:
  - `schedules` musi zawierać **dokładnie 4 elementy**.
  - Każdy element musi zawierać:
    - `season`: jeden z `spring|summer|autumn|winter`
    - `watering_interval`: int w zakresie [0, 365]
    - `fertilizing_interval`: int w zakresie [0, 365]; **0 wyłącza nawożenie**
  - Zbiór sezonów musi być **unikalny** i **kompletny** (wszystkie 4 pory roku).

## 3. Szczegóły odpowiedzi
- **200 OK** (sukces):

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "season": "winter",
      "watering_interval": 10,
      "fertilizing_interval": 0,
      "created_at": "2026-01-29T10:00:00.000Z",
      "updated_at": "2026-01-29T10:00:00.000Z"
    }
  ],
  "error": null
}
```

- **400 Bad Request** (walidacja):

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "validation_error",
    "message": "Invalid request body.",
    "details": { "fieldErrors": { "schedules": ["..."] } }
  }
}
```

- **401 Unauthorized**:

```json
{
  "success": false,
  "data": null,
  "error": { "code": "unauthorized", "message": "Authentication required." }
}
```

- **404 Not Found** (nie istnieje / brak dostępu):

```json
{
  "success": false,
  "data": null,
  "error": { "code": "not_found", "message": "Plant not found." }
}
```

- **500 Internal Server Error**:

```json
{
  "success": false,
  "data": null,
  "error": { "code": "server_error", "message": "Unexpected server error." }
}
```

## 4. Przepływ danych
### Wykorzystywane typy (DTO i Command modele)
- **DTO / Envelope**:
  - `ApiResponseDto<T>`
  - `SeasonalScheduleDto` (z `created_at`, `updated_at`)
- **Command modele**:
  - `UpdateSchedulesCommand`
  - `SeasonalScheduleCommand`
- **Typy pomocnicze**:
  - `Season` (enum: `spring|summer|autumn|winter`)
  - `Json` (dla `details` w błędach)

### Przepływ w runtime
1. **Astro route** (`src/pages/api/plants/[id]/schedules.ts`):
   - Odczyt `params.id`
   - Parsowanie JSON body
   - Walidacja Zod (`params`, `body`)
   - Pobranie `supabase` z `locals.supabase` (zgodnie z regułami).
   - Ustalenie `userId`:
     - docelowo z Supabase Auth (sesja/użytkownik),
     - jeśli projekt używa tymczasowego `DEFAULT_USER_ID`, endpoint powinien mieć jasno oznaczony TODO i docelowy mechanizm 401.
2. **Service** (`src/lib/services/plant-card.service.ts`):
   - Guard: `assertPlantOwnershipOrNotFound(supabase, userId, plantId)` (chroni przed IDOR).
   - Zapis harmonogramów w `seasonal_schedule`:
     - usuń istniejące wpisy dla `plant_card_id`
     - wstaw 4 wpisy z payloadu (zapewnia świeże `created_at/updated_at`, bo brak triggerów w DB).
   - (Opcjonalnie, ale zalecane dla spójności aplikacji) przeliczenie:
     - `next_watering_at`, `next_fertilizing_at`, `status_priority` w `plant_card`
     - na podstawie istniejącej logiki (jak w `updatePlantCard`), z uwzględnieniem zasady: `fertilizing_interval = 0` → `next_fertilizing_at = null`.
3. **Odczyt i zwrot danych**:
   - Pobierz aktualne wiersze `seasonal_schedule` dla `plant_card_id` i zwróć jako `SeasonalScheduleDto[]` w `ApiResponseDto`.

## 5. Względy bezpieczeństwa
- **Uwierzytelnianie**: wymagana aktywna sesja; brak → **401**.
- **Autoryzacja / ownership**:
  - Endpoint musi weryfikować, że `plant_card.user_id === auth.uid()` (lub równoważne).
  - Przy braku uprawnień zwrócić **404**, aby nie ujawniać istnienia zasobu.
- **Walidacja i sanityzacja**:
  - Zod `.strict()` na body, aby odrzucać nadmiarowe pola.
  - Wymuszenie kompletnego zestawu sezonów eliminuje niejednoznaczne stany.
- **RLS**:
  - W repo istnieją migracje wyłączające RLS (`disable_rls*.sql`) → endpoint nie może polegać na politykach; kontrola w service jest obowiązkowa.

## 6. Obsługa błędów
- **400**:
  - `id` nie jest UUID
  - body nie jest JSON
  - `schedules` nie jest tablicą 4 elementów
  - `season` spoza dozwolonego zbioru, brakuje sezonu, duplikaty sezonów
  - `watering_interval` / `fertilizing_interval` nie są int lub są poza [0, 365]
- **401**:
  - brak użytkownika w kontekście sesji/auth
- **404**:
  - roślina nie istnieje albo nie należy do użytkownika
- **500**:
  - nieobsłużone błędy Supabase/DB/runtime
- **Logowanie**:
  - `console.error` z obiektem kontekstowym (route, plant_id, request_id, error)
  - Nie logować całego body (ryzyko PII / noise); wystarczy `plant_id`, `user_id`, `request_id`.

## 7. Wydajność
- Operacje DB:
  - 1x sprawdzenie własności (select)
  - 1x delete po `plant_card_id`
  - 1x insert 4 wierszy
  - 1x select listy harmonogramów do odpowiedzi
  - (opcjonalnie) 1x update `plant_card` dla przeliczeń
- Indeksy:
  - `idx_seasonal_schedule_plant_card_id` wspiera szybkie pobieranie/usuwanie po `plant_card_id`.
- Spójność:
  - Bez transakcji istnieje małe okno niespójności między delete i insert. Dla API przyjmujemy to jako akceptowalne (typowy wzorzec w projekcie), ale jeśli będzie wymagane, rozważyć RPC/transaction po stronie DB.

## 8. Kroki implementacji
1. **Dodaj endpoint**: utwórz `src/pages/api/plants/[id]/schedules.ts`
   - `export const prerender = false`
   - `PUT` handler w formacie jak inne route’y (Zod + `ApiResponseDto`).
2. **Zaimplementuj schemy Zod**:
   - `paramsSchema`: `{ id: z.string().uuid() }`
   - `scheduleSchema`: `{ season: z.enum([...]), watering_interval: z.number().int().min(0).max(365), fertilizing_interval: z.number().int().min(0).max(365) }`
   - `bodySchema`: `{ schedules: z.array(scheduleSchema).length(4) }.strict()`
   - Dodatkowy check kompletności sezonów po parsowaniu (Set + porównanie do wymaganych 4).
3. **Uwierzytelnianie**:
   - Docelowo: odczytaj usera z Supabase Auth (brak → 401).
   - Jeśli w projekcie pozostaje `DEFAULT_USER_ID`, umieścić TODO i docelową ścieżkę 401.
4. **Dodaj funkcję w service** (preferowane w `src/lib/services/plant-card.service.ts`):
   - `updatePlantSchedules(supabase, userId, plantId, command: UpdateSchedulesCommand): Promise<SeasonalScheduleDto[]>`
   - W środku:
     - `assertPlantOwnershipOrNotFound`
     - `delete from seasonal_schedule where plant_card_id = plantId`
     - `insert` 4 wiersze (`plant_card_id`, `season`, `watering_interval`, `fertilizing_interval`)
     - (opcjonalnie) przelicz `next_*` oraz `status_priority` jak w `updatePlantCard`
     - `select` i zwróć aktualne harmonogramy posortowane po `season` (stabilność odpowiedzi).
5. **Podłącz service w endpoint**:
   - Wywołaj `updatePlantSchedules(...)`
   - Zwróć `200` z `ApiResponseDto<SeasonalScheduleDto[]>`.
6. **Obsługa błędów w endpoint**:
   - Walidacja → 400 z `validation_error` i `details` (flatten).
   - `ResourceNotFoundError` → 404.
   - Auth brak → 401.
   - Inne → 500 + `console.error` z kontekstem.
7. **Testy manualne (minimum)**:
   - poprawny payload 4 sezonów → 200 + 4 elementy z timestampami
   - brak jednego sezonu → 400
   - duplikat sezonu → 400
   - wartości spoza 0..365 → 400
   - niepoprawny UUID → 400
   - nieistniejące `id` → 404
   - brak sesji → 401
