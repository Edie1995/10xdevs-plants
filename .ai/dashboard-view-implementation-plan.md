# Plan implementacji widoku Dashboard

## 1. Przegląd
Widok **Dashboard** (`/app/dashboard`) to główny ekran aplikacji po zalogowaniu. Jego celem jest:
- szybki przegląd pilności (sekcja „Wymagają uwagi”),
- szybkie akcje pielęgnacyjne (podlewanie/nawożenie z opcją backdating),
- pełna lista roślin użytkownika (paginacja + wyszukiwanie + sortowanie),
- statystyki (`total_plants`, `urgent`, `warning`).

Widok jest zasilany jednym payloadem z `GET /api/dashboard`, a akcje „Podlano/Nawożono” realizowane są przez `POST /api/plants/:id/care-actions`. Aby poprawnie blokować akcje przy braku harmonogramu i wyłączonym nawożeniu, widok dodatkowo korzysta z `GET /api/plants/:id/schedules`.

## 2. Routing widoku
- **Ścieżka**: `/app/dashboard`
- **Plik strony (Astro)**: `src/pages/app/dashboard.astro`
- **Wymóg dostępu**: tylko po zalogowaniu (PRD US-006, UI-plan §1.1).
  - Minimalnie (MVP) obsłużyć sytuację, gdy API zwraca `401` → przekierowanie do `/auth/login?redirectTo=/app/dashboard?...`.

## 3. Struktura komponentów
Proponowana struktura plików (zgodna z konwencją repo):
- `src/pages/app/dashboard.astro` – strona, przekazuje URL/query i osadza komponent React.
- `src/components/dashboard/DashboardView.tsx` – kontener widoku (główna logika, fetch, stany).
- `src/components/dashboard/DashboardStats.tsx` – statystyki.
- `src/components/dashboard/RequiresAttentionSection.tsx` – sekcja „Wymagają uwagi”.
- `src/components/dashboard/AllPlantsSection.tsx` – sekcja „Wszystkie moje rośliny”.
- `src/components/dashboard/DashboardToolbar.tsx` – wyszukiwarka + sortowanie.
- `src/components/plants/PlantCard.tsx` – karta rośliny (UI + quick actions).
- `src/components/plants/QuickActions.tsx` – przyciski „dziś” + otwarcie modalu.
- `src/components/plants/BackdateCareActionModal.tsx` – modal backdating.
- `src/components/common/EmptyState.tsx` – stan pusty (ogród pusty / brak wyników).
- `src/components/common/Pagination.tsx` – paginacja.
- `src/lib/api/api-client.ts` – helper do `fetch` + parsowanie `ApiResponseDto<T>`.
- `src/lib/date/format.ts` – helper formatowania dat do `DD.MM.RRRR` oraz `YYYY-MM-DD`.
- `src/lib/dashboard/dashboard-viewmodel.ts` – mapowanie DTO → ViewModel.

## 4. Szczegóły komponentów

### `DashboardView`
- **Opis komponentu**: Główny kontener widoku. Czyta stan z URL query, pobiera dane z `GET /api/dashboard`, renderuje statystyki oraz dwie sekcje list. Koordynuje odświeżenie danych po akcjach pielęgnacyjnych i trzyma stan ładowania/błędów.
- **Główne elementy**:
  - wrapper `<main>` z nagłówkiem (tytuł „Dashboard”),
  - `<DashboardStats />`,
  - `<RequiresAttentionSection />` (warunkowo),
  - `<AllPlantsSection />` (z `<DashboardToolbar />` + `<Pagination />`).
- **Obsługiwane interakcje**:
  - zmiana `search/sort/direction/page/limit` (aktualizacja URL + refetch),
  - obsługa „clear search”,
  - obsługa sukcesu/błędu z quick actions (toast + refetch).
- **Obsługiwana walidacja (zgodnie z API)**:
  - `page`: int ≥ 1,
  - `limit`: int 1–20,
  - `search`: trim, max 50,
  - `sort`: `priority | name | created`,
  - `direction`: `asc | desc`.
  - Po stronie UI: nie pozwalać ustawić wartości spoza zakresu (np. limit tylko z predefiniowanych opcji: 10/20).
- **Typy (DTO i ViewModel)**:
  - DTO: `ApiResponseDto<DashboardDto>`, `DashboardDto`, `PaginationDto` (`src/types.ts`)
  - VM: `DashboardViewModel`, `PlantCardVM`, `DashboardStatsVM`, `DashboardQueryState`
- **Props (interfejs)**:
  - `initialQuery: DashboardQueryState` (z URL),
  - opcjonalnie `initialData?: ApiResponseDto<DashboardDto>` (gdy zdecydujecie się SSR-ować pierwsze renderowanie),
  - `initialUrl: string` (do budowy redirectTo).

### `DashboardStats`
- **Opis komponentu**: Prezentuje 3 kafelki: „Wszystkie”, „Pilne”, „Na dziś”.
- **Główne elementy**:
  - siatka 3 kolumn (responsive),
  - komponenty shadcn: `Card`/`CardContent` + typografia.
- **Obsługiwane interakcje**: brak (prezentacja).
- **Walidacja**: brak (liczby zawsze ≥ 0).
- **Typy**:
  - `DashboardStatsVM`:
    - `totalPlants: number`
    - `urgent: number`
    - `warning: number`
- **Props**:
  - `stats: DashboardStatsVM`
  - `isLoading?: boolean` (opcjonalnie skeleton).

### `RequiresAttentionSection`
- **Opis komponentu**: Lista roślin wymagających uwagi (termin dziś lub przeterminowany). Renderować **tylko**, gdy `requires_attention.length > 0`.
- **Główne elementy**:
  - nagłówek sekcji,
  - lista kart (`PlantCard`) w układzie grid.
- **Obsługiwane interakcje**:
  - quick actions na kartach (przez `PlantCard`).
- **Walidacja**: brak dodatkowej.
- **Typy**:
  - `PlantCardVM[]`
- **Props**:
  - `items: PlantCardVM[]`
  - `onCareActionCompleted: () => void` (po sukcesie odśwież dashboard)
  - `onOpenScheduleCta: (plantId: string) => void` (nawigacja do `/app/plants/:id?tab=schedule`)

### `AllPlantsSection`
- **Opis komponentu**: Pełna lista roślin użytkownika, paginowana i filtrowana przez `search`. To jest „źródło prawdy” dla listy roślin na dashboardzie.
- **Główne elementy**:
  - `<DashboardToolbar />` (search + sort),
  - lista `PlantCard`,
  - `<Pagination />`,
  - stan pusty dla braku wyników.
- **Obsługiwane interakcje**:
  - wpisanie wyszukiwania i submit,
  - klik „wyczyść”,
  - zmiana sortowania,
  - zmiana strony.
- **Walidacja (UI)**:
  - search max 50 znaków (blokada wpisywania lub walidacja na submit),
  - na zmianę `search/sort/direction` resetować `page` do 1.
- **Typy**:
  - `PlantCardVM[]`, `PaginationVM`, `DashboardQueryState`
- **Props**:
  - `items: PlantCardVM[]`
  - `pagination: PaginationVM`
  - `query: DashboardQueryState`
  - `onQueryChange: (next: DashboardQueryState) => void`
  - `onCareActionCompleted: () => void`

### `DashboardToolbar`
- **Opis komponentu**: Kontrolki listy „Wszystkie moje rośliny”: wyszukiwarka + sortowanie.
- **Główne elementy**:
  - `Input` (shadcn) dla `search`,
  - `Button` „Szukaj” (opcjonalnie) + ikona „X” do czyszczenia,
  - `Select` (shadcn) dla `sort` (`priority`, `name`, `created`) + opcjonalny `direction` (np. tylko dla `name/created`).
- **Obsługiwane interakcje**:
  - `onSubmit` formularza,
  - `onClearSearch`,
  - `onSortChange`, `onDirectionChange`.
- **Walidacja**:
  - `search.trim()`; jeśli po trim jest pusty → usuń parametr z URL,
  - `search.length <= 50` (blokada lub komunikat inline),
  - wartości select tylko z enumeracji.
- **Typy**:
  - `DashboardQueryState`
- **Props**:
  - `query: DashboardQueryState`
  - `onChange: (patch: Partial<DashboardQueryState>) => void`
  - `onSubmit: () => void`
  - `onClear: () => void`

### `PlantCard`
- **Opis komponentu**: Karta rośliny używana w obu listach. Pokazuje identyfikację (ikona/kolor), nazwę, status pilności (kolor + badge + tekst), terminy (podlewanie/nawożenie) w formacie `DD.MM.RRRR` oraz quick actions.
- **Główne elementy**:
  - container `Card`,
  - header z ikoną + nazwą,
  - status: kolor + `Badge` (A11y: tekst nie może zależeć wyłącznie od koloru),
  - terminy: dwa wiersze (podlewanie/nawożenie),
  - `<QuickActions />` (przyciski + modal).
- **Obsługiwane interakcje**:
  - klik karty (opcjonalnie) → przejście do `/app/plants/:id` (jeśli taki widok istnieje),
  - quick actions (dziś / backdate).
- **Walidacja / warunki UI**:
  - jeśli brak harmonogramu (patrz hook `usePlantSchedules`) → przyciski disabled + CTA „Ustaw harmonogram”,
  - jeśli nawożenie wyłączone dla sezonu i wybranej daty (`fertilizing_interval === 0`) → akcja nawożenia disabled,
  - jeśli API zwróci `400 schedule_missing` lub `500 schedule_incomplete` → pokaż inline komunikat + CTA do ustawienia harmonogramu.
- **Typy**:
  - `PlantCardVM`
- **Props**:
  - `plant: PlantCardVM`
  - `onCareActionCompleted: () => void`
  - `onNavigateToSchedule: (plantId: string) => void`

### `QuickActions`
- **Opis komponentu**: Dwa primary actions: „Podlano dziś”, „Nawożono dziś” oraz link/button do otwarcia modalu z wyborem daty (backdating).
- **Główne elementy**:
  - `Button` dla każdej akcji,
  - dodatkowy `Button`/`DropdownMenu` „Ustaw datę…” (per typ akcji) → otwiera modal.
- **Obsługiwane interakcje**:
  - klik „dziś” → `POST /api/plants/:id/care-actions` bez `performed_at`,
  - otwarcie modalu backdating.
- **Walidacja**:
  - przed wysłaniem: upewnić się, że harmonogram jest dostępny (patrz `usePlantSchedules`),
  - blokada nawożenia, jeśli `fertilizing_interval === 0` dla sezonu i daty.
- **Typy**:
  - `CareActionType` (`watering | fertilizing`) jako VM enum (może być alias do `CareActionType` z `src/types.ts`)
- **Props**:
  - `plantId: string`
  - `scheduleState: PlantScheduleStateVM`
  - `onSuccess: () => void`
  - `onError: (e: ApiErrorViewModel) => void`

### `BackdateCareActionModal`
- **Opis komponentu**: Modal wyboru daty wstecznej dla podlewania/nawożenia.
- **Główne elementy**:
  - `Dialog` (shadcn) z `Input type="date"` (lub `Calendar` jeśli dostępny),
  - `Button` „Zapisz” i „Anuluj”,
  - inline miejsce na błąd walidacji (np. `performed_at_in_future`, `fertilizing_disabled`, `schedule_missing`).
- **Obsługiwane interakcje**:
  - wybór daty,
  - submit → `POST /api/plants/:id/care-actions` z `performed_at: YYYY-MM-DD`,
  - cancel/ESC.
- **Walidacja (zgodnie z API + wymagania)**:
  - `performed_at` musi mieć format `YYYY-MM-DD`,
  - `performed_at ≤ dziś` (UI: `max` na `<input type="date">` ustawiony na dziś),
  - jeśli `action_type === "fertilizing"` i `fertilizing_interval === 0` dla sezonu daty → blokada submit + komunikat (bez requestu).
- **Typy**:
  - request: `CareActionCreateCommand` (`src/types.ts`)
- **Props**:
  - `open: boolean`
  - `actionType: "watering" | "fertilizing"`
  - `plantId: string`
  - `scheduleState: PlantScheduleStateVM`
  - `onOpenChange: (open: boolean) => void`
  - `onSubmitted: () => void`

### `EmptyState`
- **Opis komponentu**: Wspólny komponent pustych stanów.
- **Warianty na Dashboardzie**:
  - **Empty garden (US-007)**: gdy `search` jest puste i dashboard zwraca 0 roślin → tekst „Twój ogród jest pusty.” + CTA „Dodaj roślinę” → `/app/plants/new`.
  - **No results (US-035)**: gdy `search` jest ustawione i nie ma wyników → tekst „Brak wyników dla: <search>” + CTA „Wyczyść wyszukiwanie”.
- **Props**:
  - `title: string`
  - `description?: string`
  - `primaryAction: { label: string; href?: string; onClick?: () => void }`

### `Pagination`
- **Opis komponentu**: Paginacja listy `all_plants`. Obsługuje przejście między stronami przy stałym `limit`.
- **Walidacja**:
  - `page` zawsze w zakresie `[1, total_pages]` (gdy `total_pages === 0`, ukryj paginację).
- **Props**:
  - `page: number`
  - `totalPages: number`
  - `onPageChange: (page: number) => void`

## 5. Typy

### Typy DTO (istniejące, używane bez zmian)
Z `src/types.ts`:
- `ApiResponseDto<T>`
- `DashboardDto`:
  - `requires_attention: PlantCardListItemDto[]`
  - `all_plants: PlantCardListItemDto[]`
  - `stats: DashboardStatsDto`
- `DashboardStatsDto`: `{ total_plants, urgent, warning }`
- `DashboardQueryDto`: `{ page?, limit?, search?, sort?, direction? }`
- `PlantCardListItemDto`: pola karty do list (id, name, icon/color, status_priority, next/last care dates, created/updated)
- `SeasonalScheduleDto` (dla `GET /api/plants/:id/schedules`)
- `CareActionCreateCommand` i `CareActionResultDto` (dla `POST /api/plants/:id/care-actions`)

### Nowe typy ViewModel (rekomendowane)
Poniższe typy powinny żyć w frontendzie (np. `src/lib/dashboard/dashboard-viewmodel.ts`) i być jedyną warstwą, z którą pracują komponenty UI.

#### `DashboardQueryState`
Reprezentuje stan query widoku (źródło prawdy w URL):
- `page: number` (domyślnie 1)
- `limit: number` (domyślnie 20, max 20)
- `search?: string` (po trim; brak parametru gdy pusty)
- `sort: "priority" | "name" | "created"` (domyślnie `"priority"`)
- `direction: "asc" | "desc"` (domyślnie `"asc"`)

#### `DashboardViewModel`
- `requiresAttention: PlantCardVM[]`
- `allPlants: PlantCardVM[]`
- `stats: DashboardStatsVM`
- `pagination: PaginationVM`
- `query: DashboardQueryState`

#### `DashboardStatsVM`
- `totalPlants: number`
- `urgent: number`
- `warning: number`

#### `PaginationVM`
- `page: number`
- `limit: number`
- `total: number`
- `totalPages: number`

#### `PlantCardVM`
Na bazie `PlantCardListItemDto`, z polami ułatwiającymi render:
- `id: string`
- `name: string`
- `iconKey: string | null`
- `colorHex: string | null`
- `difficulty: "easy" | "medium" | "hard" | null`
- `statusPriority: 0 | 1 | 2`
- `statusLabel: "Pilne" | "Na dziś" | "OK"`
- `statusTone: "danger" | "warning" | "neutral"` (do klas Tailwind/badge)
- `nextWateringAt?: string | null` (ISO)
- `nextFertilizingAt?: string | null` (ISO)
- `nextWateringDisplay: string` (np. `DD.MM.RRRR` lub `—`)
- `nextFertilizingDisplay: string` (np. `DD.MM.RRRR` lub `—`)
- `dueDatesTone`:
  - `watering: "overdue" | "today" | "future" | "none"`
  - `fertilizing: "overdue" | "today" | "future" | "none"`
- `links`:
  - `detailsHref: string` (np. `/app/plants/${id}`)
  - `scheduleHref: string` (np. `/app/plants/${id}?tab=schedule`)

#### `PlantScheduleStateVM`
Stan harmonogramu rośliny po stronie UI (do blokad quick actions):
- `status: "unknown" | "loading" | "ready" | "missing" | "incomplete" | "error"`
- `schedules?: SeasonalScheduleDto[]` (gdy `ready`)
- `lastCheckedAt?: number` (timestamp, do cache)
- `error?: ApiErrorViewModel`

#### `ApiErrorViewModel`
Ujednolicony model błędu na UI:
- `code: string`
- `message: string`
- `details?: unknown`
- `httpStatus?: number`

## 6. Zarządzanie stanem

### Źródło prawdy dla listy: URL query
Zgodnie z UI-plan (§1.2) stan listy ma być odtwarzalny i linkowalny. Zasada:
- `DashboardView` czyta `DashboardQueryState` z `window.location.search` przy starcie,
- przy zmianach (search/sort/page) aktualizuje URL przez `history.pushState` (albo `replaceState` przy drobnych zmianach),
- każda zmiana query wyzwala refetch `GET /api/dashboard`.

### Rekomendowane hooki

#### `useDashboardQueryState()`
Cel: utrzymywać `DashboardQueryState` zsynchronizowany z URL.
- wejście: brak (czyta z `window.location`)
- wyjście:
  - `query: DashboardQueryState`
  - `setQuery(patch | next)` – aktualizuje URL i stan
  - obsługa `popstate` (back/forward) → aktualizuje stan i refetch
- walidacja: normalizuje wartości do bezpiecznych defaultów (np. `page` < 1 → 1; `limit` spoza [1,20] → 20)

#### `useDashboardData(query)`
Cel: pobrać i trzymać dane dashboardu:
- stany:
  - `isLoading` (pierwszy load),
  - `isRefreshing` (kolejne loady po zmianie query),
  - `error` (globalny),
  - `data: DashboardViewModel | null`
- logika:
  - `fetchDashboard(query)` → `GET /api/dashboard?…`
  - mapowanie DTO → VM
  - obsługa `401` (ustaw `authRequired` i deleguj redirect w widoku)
  - abort poprzednich requestów przy szybkim wpisywaniu w search (jeśli wprowadzicie debounce)

#### `usePlantSchedulesCache()`
Cel: cache harmonogramów per `plantId`, żeby poprawnie:
- zablokować quick actions przy braku harmonogramu,
- zablokować nawożenie, gdy `fertilizing_interval === 0` dla sezonu wybranej daty.

API:
- `getOrLoad(plantId): Promise<PlantScheduleStateVM>`
- `stateByPlantId: Map<string, PlantScheduleStateVM>`

Zasady:
- ładować schedules **lazy**: dopiero przy pierwszej interakcji quick action na danej roślinie (otwarcie modalu lub klik „dziś”),
- cache z TTL (np. 5 min) lub do końca sesji widoku.

## 7. Integracja API

### `GET /api/dashboard`
- **Wejście (query)**: `DashboardQueryState` → query params:
  - `page`, `limit`, `search`, `sort`, `direction`
- **Odpowiedź**: `ApiResponseDto<DashboardDto>` + `pagination` (dotyczy `all_plants`)
- **Mapowanie do VM**:
  - `data.requires_attention` → `requiresAttention`
  - `data.all_plants` → `allPlants`
  - `data.stats` → `stats`
  - `pagination` → `pagination`

Ważne: endpoint stosuje `search` także do stats i requires_attention. Dlatego rozróżnienie:
- **US-007 (pusty ogród)**: `search` nieustawione + `stats.total_plants === 0`
- **US-035 (brak wyników)**: `search` ustawione + `all_plants.length === 0`

### `GET /api/plants/:id/schedules`
- **Cel w Dashboardzie**: warunki UI dla quick actions:
  - brak harmonogramu / niekompletne sezony → disabled + CTA do ustawienia.
- **Odpowiedź sukces**: `ApiResponseDto<SeasonalScheduleDto[]>`
- **Błędy istotne dla UI**:
  - `404 not_found` → roślina nie istnieje / brak dostępu,
  - `500 schedule_incomplete` → traktować jako „Brak harmonogramu” (z komunikatem i CTA).

### `POST /api/plants/:id/care-actions`
- **Request body** (`CareActionCreateCommand`):
  - `action_type: "watering" | "fertilizing"`
  - `performed_at?: "YYYY-MM-DD"` (jeśli brak → „dziś”)
- **Response**: `ApiResponseDto<CareActionResultDto>`:
  - `care_log` + `plant` (zaktualizowana karta)
- **Błędy/warunki do obsługi w UI**:
  - `400 performed_at_in_future` → inline błąd w modalu (lub toast przy akcji „dziś” jeśli data była z UI),
  - `400 schedule_missing` → zablokować akcje + CTA „Ustaw harmonogram”,
  - `400 fertilizing_disabled` → komunikat inline „Nawożenie wyłączone w tym sezonie” + disabled,
  - `404 not_found` → roślina usunięta / brak dostępu (toast + refetch),
  - `401 unauthorized` → redirect do logowania,
  - `500 server_error` → toast „Coś poszło nie tak”.

## 8. Interakcje użytkownika

### Sekcja „Wymagają uwagi”
- **Wejście**: widoczna tylko gdy `requires_attention` niepuste.
- **Akcje**:
  - „Podlano dziś” → zapis akcji, po sukcesie roślina może zniknąć z sekcji (US-031) po odświeżeniu danych.
  - „Nawożono dziś” → jw., z uwzględnieniem blokady nawożenia.
  - „Ustaw datę…” → modal backdating.

### Sekcja „Wszystkie moje rośliny”
- **Wyszukiwanie (US-021)**:
  - wpisanie frazy i submit → aktualizacja `search` w URL, reset `page=1`, refetch.
  - puste/whitespace → usuń `search` z URL.
- **Brak wyników (US-035)**:
  - gdy `search` ustawione i lista pusta → komunikat + CTA „Wyczyść”.
- **Paginacja (US-022)**:
  - `limit` max 20; UI nie pozwala na >20,
  - przełączenie strony → update `page` w URL i refetch.
- **Sortowanie (US-019)**:
  - default: `sort=priority` + wymuszone tie-breaker po nazwie (backend),
  - opcjonalnie: `sort=name` oraz `sort=created` (z `direction`).

### Empty state (US-007)
- Gdy `search` nieustawione i brak roślin:
  - tekst: „Twój ogród jest pusty.”
  - CTA: „Dodaj roślinę” → `/app/plants/new`

## 9. Warunki i walidacja

### Walidacje wejścia query (UI)
UI ma utrzymywać query zgodne z kontraktem `GET /api/dashboard`:
- `page`: zawsze int ≥ 1 (na wejściu i przy `onPageChange`),
- `limit`: int 1–20 (stałe wartości w UI),
- `search`: `trim()`, max 50,
- `sort`: enum (`priority | name | created`),
- `direction`: enum (`asc | desc`).

### Warunki dla quick actions (UI)
UI musi weryfikować i odpowiednio odzwierciedlać wymagania API:
- **Brak harmonogramu**:
  - wykrycie przez `GET /api/plants/:id/schedules`:
    - `500 schedule_incomplete` lub brak danych → oznacz `PlantScheduleStateVM.status = "incomplete" | "missing"`
  - skutek w UI:
    - przyciski quick actions `disabled`,
    - inline komunikat „Ustaw harmonogram, aby korzystać z akcji”
    - CTA do `/app/plants/:id?tab=schedule`.
- **Nawożenie wyłączone w sezonie**:
  - jeśli schedules `ready`, wylicz sezon dla daty (dzisiaj lub `performed_at`) według tej samej reguły co backend (`getSeasonForDate`: mar–maj spring, cze–sie summer, wrz–lis autumn, reszta winter; liczone po UTC),
  - jeśli `fertilizing_interval === 0` dla sezonu → zablokuj nawożenie i pokaż komunikat,
  - jeśli mimo wszystko API zwróci `400 fertilizing_disabled` → potraktuj jak wyżej (source of truth).
- **Backdating**:
  - `<input type="date">` z `max = today(YYYY-MM-DD)`; submit z przyszłą datą zablokowany,
  - jeśli API zwróci `performed_at_in_future` → pokaż inline błąd.

## 10. Obsługa błędów

### Błędy globalne (widok)
- `GET /api/dashboard`:
  - `401 unauthorized` → redirect do login z `redirectTo` (z zachowaniem query),
  - `400 validation_error` → fallback: wyczyść niepoprawne parametry (przywróć defaulty), `replaceState`, refetch,
  - `500 server_error` → PageError + przycisk „Spróbuj ponownie” (refetch).

### Błędy per-plant (quick actions / modal)
- `POST /care-actions`:
  - `schedule_missing` → w UI przełącz stan rośliny na „brak harmonogramu” + CTA,
  - `fertilizing_disabled` → komunikat inline + disabled nawożenia,
  - `performed_at_in_future` → walidacja inline w modalu,
  - `not_found` → toast + odśwież listę (roślina mogła zostać usunięta),
  - inne `400` → toast „Nie udało się zapisać akcji”.

### UX komunikatów (PRD)
- sukces i błędy ogólne: toast ~3s (PRD §5.2),
- walidacje pól/modalu: inline (UI-plan §1.3).

## 11. Kroki implementacji

1. **Utwórz routing dla dashboardu**
   - Dodaj `src/pages/app/dashboard.astro`.
   - Osadź komponent React `DashboardView` (`client:load`), przekazując `initialUrl` (z `Astro.url`) oraz (opcjonalnie) SSR-owy `initialQuery`.

2. **Dodaj warstwę API client w frontendzie**
   - `src/lib/api/api-client.ts`:
     - funkcja `apiGet<T>(path, params)` i `apiPost<T>(path, body)`,
     - parsowanie `ApiResponseDto<T>`, normalizacja błędów do `ApiErrorViewModel`,
     - obsługa statusów HTTP (szczególnie 400/401/404/500).

3. **Zaimplementuj synchronizację query z URL**
   - Hook `useDashboardQueryState()`:
     - parse → `DashboardQueryState`,
     - `setQuery` aktualizuje URL i stan,
     - obsługa `popstate`.

4. **Zaimplementuj pobieranie dashboardu**
   - Hook `useDashboardData(query)`:
     - wywołuje `GET /api/dashboard`,
     - mapuje DTO → VM (w `src/lib/dashboard/dashboard-viewmodel.ts`),
     - zwraca `data/isLoading/error/refetch`.

5. **Zbuduj strukturę widoku**
   - `DashboardView` renderuje:
     - `DashboardStats` (z `data.stats`),
     - `RequiresAttentionSection` jeśli `requiresAttention.length > 0`,
     - `AllPlantsSection` z toolbar + paginacją.

6. **Dodaj EmptyState i NoResults**
   - Logika:
     - jeśli `!query.search` i `stats.totalPlants === 0` → Empty garden (US-007),
     - jeśli `query.search` i `allPlants.length === 0` → No results (US-035).

7. **Zaimplementuj `PlantCard` + quick actions**
   - `PlantCard` renderuje status i terminy (format `DD.MM.RRRR` + kolorystyka zgodna z `status_priority` i US-020).
   - Dodaj `QuickActions` + `BackdateCareActionModal`.

8. **Dodaj cache harmonogramów i logikę blokad**
   - Hook `usePlantSchedulesCache()`:
     - `GET /api/plants/:id/schedules` przy pierwszej interakcji,
     - cache wyników,
     - mapowanie `schedule_incomplete` na stan „brak harmonogramu”.
   - Funkcja `getSeasonForDateUtc(date)` w FE (zgodna z backendem).
   - Blokada nawożenia, gdy `fertilizing_interval === 0` dla sezonu.

9. **Integracja mutacji care-actions**
   - `POST /api/plants/:id/care-actions`:
     - przy „dziś” bez `performed_at`,
     - przy backdating z `performed_at`.
   - Po sukcesie:
     - toast sukcesu,
     - `refetch()` dashboardu, aby zaktualizować listy/stats (US-026, US-031).

10. **Obsługa błędów i a11y**
   - Dla modali: focus trap, ESC, poprawne aria.
   - Statusy: nie tylko kolor (badge + tekst).
   - Wszędzie: komunikaty inline tam, gdzie to walidacja, toast tylko dla globalnych.

11. **Test plan (manual)**
   - Dashboard:
     - wejście bez roślin → Empty garden + CTA,
     - search bez wyników → No results + „Wyczyść”,
     - paginacja działa, limit ≤ 20.
   - Quick actions:
     - podlewanie „dziś” aktualizuje status i usuwa z „Wymagają uwagi” (jeśli dotyczy),
     - backdating nie pozwala wybrać przyszłości,
     - brak harmonogramu → akcje zablokowane + CTA do schedule,
     - nawożenie wyłączone (`fertilizing_interval = 0`) → akcja niedostępna,
     - symulacja błędów (np. 500) → toast / PageError.

