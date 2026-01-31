## API Endpoint Implementation Plan: `PUT /api/plants/:id`

## 1. Przegląd punktu końcowego
Endpoint aktualizuje istniejącą kartę rośliny (`plant_card`) należącą do zalogowanego użytkownika. Pozwala na częściowe aktualizacje pól oraz opcjonalną aktualizację zagnieżdżonych relacji (`seasonal_schedule`, `disease_entry`). Jeśli w wyniku zmian mają się zmienić terminy opieki, endpoint musi ponownie wyliczyć priorytet na podstawie `next_*_at`.

## 2. Szczegóły żądania
- Metoda HTTP: `PUT`
- Struktura URL: `/api/plants/:id`
- Parametry:
  - Wymagane:
    - `id` (UUID) – identyfikator `plant_card`
  - Opcjonalne: brak
- Nagłówki:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>` (jeśli w projekcie używane są tokeny w nagłówku; alternatywnie cookie Supabase – zależnie od integracji)
- Request Body (JSON) – **wszystkie pola opcjonalne**, przy czym:
  - jeśli `name` jest podane → musi być `trim().min(1)`:

```json
{
  "name": "string (≤50)",
  "soil": "string (≤200)",
  "pot": "string (≤200)",
  "position": "string (≤50)",
  "difficulty": "easy|medium|hard",
  "watering_instructions": "string (≤2000)",
  "repotting_instructions": "string (≤2000)",
  "propagation_instructions": "string (≤2000)",
  "notes": "string (≤2000)",
  "icon_key": "string (≤50)",
  "color_hex": "#RRGGBB",
  "schedules": [
    { "season": "spring|summer|autumn|winter", "watering_interval": 0-365, "fertilizing_interval": 0-365 }
  ],
  "diseases": [
    { "name": "string (≤50)", "symptoms": "string (≤2000)", "advice": "string (≤2000)" }
  ]
}
```

### Wykorzystywane typy
- `src/types.ts`:
  - `PlantCardUpdateCommand` – model komendy po walidacji wejścia
  - `PlantCardDetailDto` – model odpowiedzi
  - `ApiResponseDto<T>` – envelope

## 3. Szczegóły odpowiedzi
- Sukces:
  - Status: `200 OK`
  - Body: `ApiResponseDto<PlantCardDetailDto>`
- Błąd:
  - Statusy: `400`, `401`, `404`, `500`
  - Body: `ApiResponseDto<null>` z `error`

Przykład (sukces):

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Monstera",
    "soil": null,
    "pot": null,
    "position": null,
    "difficulty": "easy",
    "watering_instructions": null,
    "repotting_instructions": null,
    "propagation_instructions": null,
    "notes": null,
    "icon_key": "leaf",
    "color_hex": "#22c55e",
    "last_watered_at": null,
    "last_fertilized_at": null,
    "next_watering_at": null,
    "next_fertilizing_at": null,
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-29T00:00:00.000Z",
    "diseases": [],
    "schedules": [],
    "recent_care_logs": []
  },
  "error": null
}
```

## 4. Przepływ danych
1. Route (`src/pages/api/plants/[id].ts`) waliduje `params.id` (UUID).
2. Route parsuje JSON body; jeśli niepoprawny JSON → `400 invalid_json`.
3. Route waliduje body Zod:
   - dopuszcza tylko pola z kontraktu,
   - `name` opcjonalne, ale jeśli obecne musi być niepuste,
   - `schedules`/`diseases` opcjonalne, z walidacją długości i zakresów.
4. Identyfikacja usera:
   - docelowo: `locals.supabase.auth.getUser()` / `getSession()` → `401` jeśli brak,
   - na dziś w repo: istnieje `DEFAULT_USER_ID` (plan zakłada migrację do realnego usera).
5. Service `updatePlantCard(supabase, userId, plantId, command)`:
   - sprawdza istnienie i własność (404 jeśli brak),
   - aktualizuje `plant_card` (tylko dozwolone pola),
   - jeśli `schedules` w payload:
     - strategia w tym planie: **replace** – usuń istniejące rekordy dla `plant_card_id`, wstaw nowe (z kontrolą unikalności sezonów),
     - następnie (jeśli `last_*_at` istnieją) przelicz `next_*_at` na podstawie zaktualizowanych intervali (dla sezonu daty `last_*_at`),
   - jeśli `diseases` w payload:
     - strategia w tym planie: **replace** – usuń istniejące, wstaw nowe,
   - jeśli w wyniku powyższego zmienią się `next_watering_at` i/lub `next_fertilizing_at`, przelicz priorytet.
6. Service pobiera i zwraca pełny rekord z relacjami:
   - `select("*, seasonal_schedule(*), disease_entry(*), care_log(*)")` + mapowanie do `PlantCardDetailDto` (jak w `createPlantCard`).
7. Route zwraca `200` z envelope.

### Reguły obliczeń terminów i priorytetu
- `next_watering_at`: jeżeli `last_watered_at` != null i istnieje `watering_interval` dla sezonu `last_watered_at` → `last_watered_at + intervalDays`
- `next_fertilizing_at`: analogicznie dla fertilizing; jeśli `fertilizing_interval = 0` → `next_fertilizing_at = null`
- Priorytet (wyliczony z wcześniejszej z `next_*_at`):
  - wyznacz najbliższy termin: `min(next_watering_at, next_fertilizing_at)` z pominięciem nulli
  - jeśli brak terminów → `2` (future/neutral)
  - jeśli najbliższy termin < teraz → `0` (overdue)
  - jeśli najbliższy termin jest „dziś” (w sensie kalendarzowym) → `1`
  - w przeciwnym wypadku → `2`

## 5. Względy bezpieczeństwa
- Uwierzytelnianie:
  - docelowo wymagane (token/cookie Supabase); brak → `401`
  - w service zawsze pracować na `userId` z auth, nie z body
- Autoryzacja:
  - RLS na tabelach (`plant_card`, `seasonal_schedule`, `disease_entry`, `care_log`) zgodnie z `.ai/db-plan.md`
  - Dodatkowo w service: sprawdzenie własności jak w `care-actions.service.ts` (strategia „404 zamiast 403”, by ograniczyć enumerację)
- Ochrona przed mass assignment:
  - body schema + jawne mapowanie pól (nigdy nie przekazywać do `.update()` całego `rawPayload`)
- Walidacja wejścia:
  - UUID w path
  - limity długości, enumy, regex `color_hex`
  - unikalność sezonów w `schedules`
- Minimalizacja wycieku danych:
  - w response zwracać DTO bez `user_id` (`PlantCardDetailDto` bazuje na `PlantCardPublicDto`)

## 6. Obsługa błędów
- `400 Bad Request`
  - `invalid_json` – body nie jest poprawnym JSON
  - `validation_error` – Zod error (do `error.details`)
  - `duplicate_season` – powtórzony `season` w `schedules`
- `401 Unauthorized`
  - `unauthorized` – brak/nieprawidłowa sesja
- `404 Not Found`
  - `not_found` – roślina nie istnieje lub nie należy do usera
- `500 Server Error`
  - `server_error` – nieoczekiwany błąd, brak mapowania

Wskazówki implementacyjne:
- Stosować spójny envelope i helpery `jsonResponse`/`errorResponse` jak w `src/pages/api/plants.ts`.
- Mapowanie błędów Supabase:
  - `23505` → (opcjonalnie) `409`/`duplicate_season` (jeśli nie wychwycone wcześniej)
  - status `401/403/400` mapować jak w istniejących endpointach
- Logowanie: `console.error("Failed to update plant card.", error)`

## 7. Wydajność
- Zapytania o roślinę i relacje:
  - Odczyt szczegółów pojedynczej rośliny jest tani (po `id`), a indeksy na FK wspierają relacje.
  - Aktualizacje relacji (replace) mogą generować więcej zapisów; dla MVP OK.
- Unikać niepotrzebnych update:
  - aktualizować `plant_card` tylko, jeśli payload zawiera przynajmniej jedno pole do zmiany (w przeciwnym razie można zwrócić aktualny stan lub `400` – w tym planie: zalecane zwrócenie aktualnego stanu po walidacji, ale z minimalnym write).
- Opcja na przyszłość (zalecana, jeśli spójność jest krytyczna):
  - transakcja w DB przez funkcję RPC (Postgres) do atomowego update `plant_card` + relacje + rekalkulacje.

## 8. Kroki implementacji
1. Dodać route `src/pages/api/plants/[id].ts` z:
   - `export const prerender = false`
   - `PUT: APIRoute`
   - `paramsSchema` (UUID) i `updateSchema` (częściowy payload)
   - wspólne helpery `jsonResponse`/`errorResponse` i `mapSupabaseError` (jak w `plants.ts`)
2. Zaimplementować w `src/lib/services/plant-card.service.ts`:
   - `assertPlantOwnershipOrNotFound(supabase, userId, plantId)`
   - `updatePlantCard(supabase, userId, plantId, command): Promise<PlantCardDetailDto>`
   - `recalculateNextDatesAndPriority(...)` (funkcja pomocnicza)
3. Ustalić i wdrożyć semantykę relacji w update (wg tego planu):
   - `schedules` obecne → replace (delete + insert)
   - `diseases` obecne → replace (delete + insert)
4. Dodać przeliczanie terminów:
   - po aktualizacji schedules, na podstawie `last_*_at` z DB i nowego intervala dla sezonu tej daty
   - aktualizacja `next_*_at` i wynikowego priorytetu (jeżeli terminy się zmieniły)
5. Testy (min. zestaw):
   - `200` – aktualizacja pojedynczego pola (np. `name`)
   - `200` – update schedules + rekalkulacja `next_*` i priorytetu
   - `400` – błędny JSON / błędny `color_hex` / `name` jako pusty string
   - `404` – nieistniejący `id` lub brak własności
   - `401` – brak sesji (po wdrożeniu auth)
6. Spójność z DB/RLS:
   - upewnić się, że migracje nie wyłączają RLS w środowisku produkcyjnym
   - zweryfikować polityki update/delete/insert dla `seasonal_schedule` i `disease_entry`
