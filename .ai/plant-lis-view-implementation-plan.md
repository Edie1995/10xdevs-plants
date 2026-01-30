# Plan implementacji widoku Rośliny (lista)

## 1. Przegląd
Widok **Rośliny (lista)** (`/app/plants`) prezentuje pełną listę roślin zalogowanego użytkownika w sposób server-driven: **wyszukiwanie, sortowanie i paginacja są odzwierciedlone w URL query**. Widok ma umożliwiać szybkie znalezienie rośliny, rozpoznanie pilności (kolory + tekst) oraz przejście do szczegółów. Na mobile każda karta ma **menu kontekstowe** z akcjami (min. edycja i usunięcie).

Zakres MVP dla widoku:
- Lista + toolbar (search/sort/direction) + paginacja (limit max 20).
- Sekcje listy (rekomendowane): grupowanie wg pilności przy sortowaniu `priority`.
- Stany: loading (skeleton), empty garden, no results, błędy (400/401/5xx).
- Menu mobile na karcie: **Edytuj / Usuń** (z potwierdzeniem usunięcia).

Poza zakresem MVP (ale z miejscem w architekturze):
- Filtr `needs_attention` (jest w API, ale **nieeksponowany w UI**).

## 2. Routing widoku
- **Ścieżka**: `/app/plants`
- **Plik routingu**: `src/pages/app/plants.astro`
  - Renderuje layout `src/layouts/Layout.astro`
  - Mountuje komponent React: `PlantsListView client:load`
  - Przekazuje `initialUrl = Astro.url.toString()` (wzorzec zgodny z `DashboardView`)

## 3. Struktura komponentów
Rekomendowana struktura (minimalna liczba nowych klocków, zgodna z istniejącymi wzorcami):
- `src/pages/app/plants.astro`
  - `Layout`
    - `PlantsListView` (React, client:load)
      - `PlantsHeader` (nagłówek + CTA)
      - `PlantsToolbar` (search/sort/direction; stan w URL)
      - `PlantsListContent`
        - `PlantsListSections` (opcjonalne sekcje wg pilności)
          - `PlantCard` (istniejący; rozszerzony o identyfikację + menu mobile)
        - `EmptyState` (gdy brak roślin / brak wyników)
      - `Pagination` (istniejący)
      - `ConfirmDeletePlantDialog` (dialog potwierdzenia)

## 4. Szczegóły komponentów

### `src/pages/app/plants.astro` (strona Astro)
- **Opis komponentu**: punkt wejścia routingu dla `/app/plants`; hostuje komponent React.
- **Główne elementy**:
  - `<Layout title="Rośliny">`
  - `<PlantsListView client:load initialUrl={initialUrl} />`
- **Obsługiwane zdarzenia**: brak (strona statyczna + hydratacja).
- **Walidacja**: brak.
- **Typy**:
  - Props: `{ initialUrl: string }`
- **Props (interfejs)**:
  - `initialUrl: string` – potrzebne do redirectu do logowania w React.

### `PlantsListView` (nowy, React) – `src/components/plants/PlantsListView.tsx`
- **Opis komponentu**: główny kontener widoku; spina query-state w URL, fetch danych, stany UI, toasty i akcje (np. usuwanie).
- **Główne elementy**:
  - `<main>` z kontenerem szerokości (jak w `DashboardView`: `mx-auto max-w-5xl px-6 py-8`)
  - Nagłówek: tytuł + opis + CTA „Dodaj roślinę”
  - `PlantsToolbar`
  - sekcja listy (grid 1/2 kolumny)
  - `Pagination`
  - `ConfirmDeletePlantDialog` (podpinany pod wybraną roślinę)
- **Obsługiwane zdarzenia**:
  - zmiana query (search/sort/direction/page) → aktualizacja URL (push/replace) + refetch
  - klik „Dodaj roślinę” → nawigacja `/app/plants/new`
  - klik „Szczegóły” na karcie → `/app/plants/:id`
  - akcje z menu mobile:
    - „Edytuj” → nawigacja do `/app/plants/:id?tab=basic`
    - „Usuń” → otwarcie `ConfirmDeletePlantDialog`
  - potwierdzenie usunięcia → wywołanie `DELETE /api/plants/:id` + refetch
- **Warunki walidacji (UI + API)**:
  - **query**:
    - `page`: liczba całkowita \(\ge 1\)
    - `limit`: liczba całkowita 1–20 (w UI rekomendowane stałe 20)
    - `search`: trim, max 50 znaków (UI), string lub brak
    - `sort`: `priority | name | created`
    - `direction`: `asc | desc`
  - W przypadku błędnego query (API `400 validation_error`) → reset do domyślnych wartości (replaceState), analogicznie do `DashboardView`.
- **Typy (DTO i ViewModel)**:
  - DTO: `PlantCardListItemDto` (z `src/types.ts`)
  - DTO: `ApiResponseDto<PlantCardListItemDto[]>` (+ `pagination`)
  - VM: `PlantCardVM` (istniejący z `src/lib/dashboard/dashboard-viewmodel.ts`, rekomendowane ponowne użycie)
  - VM: `PlantsListViewModel` (nowy, patrz sekcja 5)
- **Props (interfejs)**:
  - `initialUrl: string`

### `PlantsToolbar` (nowy lub refaktor istniejącego) – `src/components/plants/PlantsToolbar.tsx`
- **Opis komponentu**: toolbar z wyszukiwaniem i sortowaniem, wzorzec 1:1 jak `DashboardToolbar`, ale semantycznie przypisany do widoku listy.
- **Główne elementy**:
  - `<form>` z:
    - `Input` typu `search`
    - `Button` „Szukaj”
    - `Button` „Wyczyść”
    - `Select` sortowania
    - `Select` kierunku sortowania
- **Obsługiwane zdarzenia**:
  - `submit` formularza → `onSubmit(search?: string)` (reset page = 1)
  - klik „Wyczyść” → `onClear()` (ustawia `search: undefined`, reset page = 1)
  - zmiana sort/direction → `onChange(patch)` (reset page = 1)
- **Warunki walidacji**:
  - `searchValue.trim().length <= 50` (inline error; **nie wysyłać** niepoprawnej wartości)
  - `maxLength={50}` na input
- **Typy**:
  - `PlantsListQueryState` (nowy; analogiczny do `DashboardQueryState`)
- **Props**:
  - `query: PlantsListQueryState`
  - `onChange: (patch: Partial<PlantsListQueryState>) => void`
  - `onSubmit: (search: string | undefined) => void`
  - `onClear: () => void`

> Alternatywa (jeśli preferowana redukcja duplikacji): zrefaktorować `DashboardToolbar` do komponentu wspólnego `src/components/common/ListToolbar.tsx` i użyć go w obu widokach.

### `PlantsListContent` / `PlantsListSections` (nowy) – `src/components/plants/PlantsListContent.tsx`
- **Opis komponentu**: render listy roślin + stany pustki + (opcjonalnie) sekcje.
- **Główne elementy**:
  - wrapper `div` (grid)
  - warianty:
    - skeletony (gdy `isLoading && items.length === 0`)
    - sekcje (gdy `sort === "priority"`)
    - płaska lista (gdy `sort !== "priority"`)
    - `EmptyState` (no results)
    - `EmptyState` (empty garden)
- **Obsługiwane zdarzenia**:
  - klik w akcje karty (delegowane do `PlantCard`)
  - otwarcie menu mobile (delegowane)
- **Walidacja**: brak.
- **Typy**:
  - `PlantCardVM[]`
  - `EmptyState` config (jak w `AllPlantsSection`)
- **Props** (przykładowe):
  - `items: PlantCardVM[]`
  - `isLoading: boolean`
  - `query: PlantsListQueryState`
  - `onRequestDelete: (plant: PlantCardVM) => void`
  - `onCareActionCompleted?: () => void` (jeśli zachowujemy quick actions)

### `PlantCard` (istniejący, rozszerzenie) – `src/components/plants/PlantCard.tsx`
- **Opis komponentu**: karta rośliny. W kontekście listy musi spełniać US-018/US-020/US-032:
  - pokazywać **nazwę, ikonę i kolor**,
  - pokazywać terminy z kolorami statusu (przeterminowane/czy na dziś),
  - zapewniać **menu mobile** (bez hover) z akcjami Edytuj/Usuń.
- **Główne elementy (docelowo)**:
  - Header:
    - identyfikator rośliny: okrąg/swatch tła/ramki w `colorHex` + ikona z `iconKey` (np. `lucide-react`, fallback do inicjału lub placeholdera)
    - `CardTitle` z nazwą
    - `Badge` statusu (już jest)
    - link „Szczegóły”
    - przycisk menu (mobile) – ikona „więcej” (`lucide-react`), widoczna zawsze na mobile
  - Content:
    - wiersze terminów (podlewanie/nawożenie) z kolorowaniem:
      - overdue → czerwony
      - today → pomarańczowy
      - future/none → neutralny
    - (opcjonalnie) `QuickActions` (już jest; jeśli zostaje w liście, trzymać lazy-load schedule jak obecnie)
- **Obsługiwane zdarzenia**:
  - klik „Szczegóły” → nawigacja do `plant.links.detailsHref`
  - klik „Ustaw harmonogram” (gdy brak schedule) → `plant.links.scheduleHref`
  - akcje quick actions (jeśli obecne): POST care-action + toast + `onCareActionCompleted`
  - klik menu mobile:
    - „Edytuj” → nawigacja do `/app/plants/:id?tab=basic`
    - „Usuń” → `onRequestDelete(plantId)`
- **Warunki walidacji**:
  - brak walidacji pól wejściowych (tylko akcje)
  - przy quick actions/backdating: blokady i walidacje już istnieją (date <= today, schedule required, fertilizing disabled w sezonie)
- **Typy**:
  - `PlantCardVM`
  - (nowe) `onRequestDelete?: (plant: PlantCardVM) => void` lub `onRequestDelete?: (plantId: string) => void`
  - (nowe) `variant?: "dashboard" | "list"` – jeśli potrzebne do różnic UI (np. always-show menu na mobile tylko w list view)
- **Props**:
  - istniejące: `plant`, `onCareActionCompleted?`, `onNavigateToSchedule?`
  - nowe (rekomendowane): `onRequestDelete?`, `onRequestEdit?` lub `onOpenMobileMenu?`

### `ConfirmDeletePlantDialog` (nowy) – `src/components/plants/ConfirmDeletePlantDialog.tsx`
- **Opis komponentu**: potwierdzenie destrukcyjnej akcji usunięcia rośliny (PRD 5.3, US-016/US-017 oraz US-032 dla listy).
- **Główne elementy**:
  - `Dialog` / `DialogContent` z:
    - tytuł: „Usunąć roślinę?”
    - opis: „Ta operacja jest nieodwracalna.”
    - CTA: „Usuń” (destructive), „Anuluj”
- **Obsługiwane zdarzenia**:
  - `onOpenChange(false)` – zamknięcie
  - klik „Anuluj” – zamknięcie bez skutków
  - klik „Usuń” – wywołanie `DELETE /api/plants/:id`
- **Warunki walidacji (UI + API)**:
  - `plantId` musi być niepusty; jeśli brak → przycisk „Usuń” disabled.
  - Obsługa kodów:
    - `200` sukces: toast sukcesu (3s), zamknięcie dialogu, refetch listy
    - `401`: redirect do `/auth/login?redirectTo=...`
    - `404` / `plant_not_found`: toast neutralny („Roślina nie istnieje / brak dostępu”), refetch listy
    - `5xx`: toast błędu
- **Typy**:
  - request: brak body
  - response: `ApiResponseDto<null>` + `message?`
  - error: `ApiErrorViewModel`
- **Props**:
  - `open: boolean`
  - `plant: Pick<PlantCardVM, "id" | "name"> | null`
  - `onOpenChange: (open: boolean) => void`
  - `onDeleted: () => void` (refetch + ewentualna korekta paginacji)
  - `onError?: (error: ApiErrorViewModel) => void` (opcjonalnie)

### `Pagination` (istniejący) – `src/components/common/Pagination.tsx`
- **Opis komponentu**: przełączanie stron.
- **Zdarzenia**:
  - `onPageChange(page)` – aktualizacja query w URL (pushState) i refetch.
- **Walidacja**:
  - blokada prev/next na granicach.
- **Typy**:
  - `page: number`, `totalPages: number`

### `EmptyState` (istniejący) – `src/components/common/EmptyState.tsx`
- **Opis komponentu**: stany pustki.
- **Zastosowanie w widoku**:
  - **Empty garden**: gdy brak roślin i brak `search` → CTA „Dodaj roślinę” → `/app/plants/new`
  - **No results**: gdy jest `search` i lista pusta → CTA „Wyczyść wyszukiwanie”

## 5. Typy

### DTO (istniejące, `src/types.ts`)
- `PlantCardListItemDto`
- `PlantListQueryDto` (zgodny z API: `page`, `limit`, `search`, `sort`, `direction`, `needs_attention?`)
- `ApiResponseDto<T>`
- `PaginationDto`
- `ApiErrorDto`

### ViewModel (rekomendowane ponowne użycie + nowe)

#### `PlantCardVM` (istniejący)
Używać `mapPlantCardDto(...)` z `src/lib/dashboard/dashboard-viewmodel.ts`, aby:
- nie dublować logiki dat (`formatDisplayDate`) i tonów terminów (`dueDatesTone`)
- mieć spójne linki do szczegółów i harmonogramu

#### Nowy: `PlantsListQueryState`
Plik rekomendowany: `src/lib/plants/plants-list-viewmodel.ts` (nowy katalog `src/lib/plants/`).

Pola:
- `page: number` (domyślnie 1)
- `limit: number` (domyślnie 20; clamp 1–20)
- `search?: string` (trim; max 50)
- `sort: "priority" | "name" | "created"` (domyślnie `"priority"`)
- `direction: "asc" | "desc"` (domyślnie `"asc"`)

#### Nowy: `PlantsListViewModel`
Pola:
- `items: PlantCardVM[]`
- `pagination: { page: number; limit: number; total: number; totalPages: number }`
- `query: PlantsListQueryState`

Opcjonalnie (jeśli chcesz zbudować sekcje w VM zamiast w komponencie):
- `sections?: Array<{ id: "urgent" | "today" | "ok"; title: string; items: PlantCardVM[] }>`

#### Nowy: `PlantsListDataState` (hook state)
Pola:
- `data: PlantsListViewModel | null`
- `error: ApiErrorViewModel | null`
- `isLoading: boolean`
- `isRefreshing: boolean`
- `authRequired: boolean`

## 6. Zarządzanie stanem
Widok jest server-driven i powinien trzymać stan listy w URL.

### Stan URL (custom hook)
Nowy hook: `src/components/hooks/usePlantsQueryState.ts`
- Wzorzec identyczny jak `useDashboardQueryState`:
  - `readQueryFromLocation()` → `normalizeQuery(...)`
  - `setQuery(next, { replace? })` → `history.pushState/replaceState` + aktualizacja stanu React
  - obsługa `popstate`
- Normalizacja/walidacja po stronie klienta:
  - `page`: min 1
  - `limit`: clamp 1–20
  - `search`: trim, max 50, `undefined` jeśli puste
  - `sort/direction`: tylko wartości z dozwolonych enumów

### Pobieranie danych (custom hook)
Nowy hook: `src/components/hooks/usePlantsData.ts`
- Analogiczny do `useDashboardData`, ale:
  - `apiGet<PlantCardListItemDto[]>("/api/plants", query)`
  - pagination z `result.response?.pagination`
  - budowa VM: mapowanie `PlantCardListItemDto[]` → `PlantCardVM[]` poprzez `mapPlantCardDto`
- Obsługa `authRequired`:
  - gdy `result.error.httpStatus === 401` → `authRequired: true`
  - w `PlantsListView` efekt: redirect do `/auth/login?redirectTo=<initialUrl>`

### Stan lokalny widoku
W `PlantsListView`:
- `pendingDelete: PlantCardVM | null` – wybrana roślina do usunięcia
- (opcjonalnie) `lastToastRef` – aby nie spamować toastów przy powtarzających się `5xx` (wzorzec z `DashboardView`)

## 7. Integracja API

### `GET /api/plants`
- **Wywołanie**: `apiGet<PlantCardListItemDto[]>("/api/plants", query)`
- **Query params** (wysyłane):
  - `page`, `limit`, `search`, `sort`, `direction`
  - `needs_attention`: **nie wysyłać w MVP** (brak kontrolki w UI)
- **Odpowiedź**:
  - `ApiResponseDto<PlantCardListItemDto[]>`
  - `pagination?: { page, limit, total, total_pages }`
- **Mapowanie do VM**:
  - `itemsVm = data.map(mapPlantCardDto)`
  - `paginationVm = { page, limit, total, totalPages }` (z `pagination.total_pages`)

### `DELETE /api/plants/:id`
- **Wywołanie**: rekomendowane dopisanie helpera `apiDelete` w `src/lib/api/api-client.ts` (dla spójności z `apiGet/apiPost`), np. `request<T>("DELETE", path, ...)`.
- **Odpowiedź**:
  - sukces: `ApiResponseDto<null>` + `message?: "Plant deleted"`
  - błędy: `ApiResponseDto<null>` z `error.code` (`plant_not_found`, `unauthorized`, `forbidden` mapowane do 404 w endpointzie) lub `http_500`

## 8. Interakcje użytkownika
- **Wejście na `/app/plants`**:
  - UI czyta query z URL i pobiera listę
  - jeśli `401` → redirect do logowania z `redirectTo`
- **Wyszukiwanie (US-021)**:
  - wpisanie frazy + „Szukaj” → `search` w URL, `page=1`, refetch
- **Brak wyników (US-035)**:
  - gdy `search` ustawione i `items.length === 0` → `EmptyState` + akcja „Wyczyść wyszukiwanie”
- **Sortowanie (US-019)**:
  - zmiana sort/direction → aktualizacja URL (reset page=1), refetch
  - przy `sort="priority"` UI może pokazywać sekcje wg pilności
- **Paginacja (US-022)**:
  - „Następna/Poprzednia” → `page` w URL, refetch
- **Wejście w szczegóły**:
  - klik „Szczegóły” na karcie → `/app/plants/:id`
- **Menu mobile na karcie (US-032)**:
  - klik ikony menu → pokazuje akcje
  - „Edytuj” → `/app/plants/:id?tab=basic`
  - „Usuń” → modal potwierdzenia
- **Usuwanie**:
  - potwierdzenie → `DELETE /api/plants/:id` → toast + refetch
  - anuluj → zamknięcie bez zmian

## 9. Warunki i walidacja

### Walidacja query (UI → API)
Dotyczy: `usePlantsQueryState`, `PlantsToolbar`, `PlantsListView`
- `search`:
  - UI trim
  - max 50 znaków (zgodnie z patternem w `DashboardToolbar`)
  - puste → usuń z URL (ustaw `undefined`)
- `page`:
  - min 1
  - reset do 1 przy zmianie `search/sort/direction/limit`
- `limit`:
  - clamp 1–20 (w MVP najlepiej trzymać 20 i nie eksponować kontrolki)
- `sort`:
  - tylko `priority|name|created`
- `direction`:
  - tylko `asc|desc`

### Warunki wynikające z API (jak weryfikować w UI)
Dotyczy: `usePlantsData`, `PlantsListView`
- `400 validation_error` (np. niepoprawne query):
  - UI **resetuje query do domyślnego** i robi replaceState (bez dopisywania historii)
- `401 unauthorized`:
  - ustaw `authRequired: true` i wykonaj redirect do `/auth/login?redirectTo=<initialUrl>`
- `403/404`:
  - dla listy: traktować jak brak zasobu/neutralnie (w praktyce API listy nie powinno zwracać 403 przy poprawnej sesji)
  - dla delete: pokazać neutralny komunikat + odświeżyć listę
- `5xx`:
  - toast błędu + opcja „Spróbuj ponownie” (przycisk refetch) lub banner jak w `DashboardView`

### Oznaczenia kolorystyczne terminów (US-020)
Dotyczy: `PlantCard`
- użyć `plant.dueDatesTone.watering/fertilizing` do nadania klas:
  - `overdue` → `text-red-700` / `bg-red-50` (subtelnie)
  - `today` → `text-amber-700` / `bg-amber-50`
  - `future/none` → `text-neutral-800`
- dodatkowo status rośliny pozostaje na `Badge` (już istnieje), ale terminy muszą spełniać US-020 niezależnie od badge.

## 10. Obsługa błędów

### Scenariusze błędów i rekomendowana obsługa
- **`GET /api/plants` → 401**:
  - natychmiastowy redirect do logowania z `redirectTo`
- **`GET /api/plants` → 400**:
  - zresetować query do domyślnych (replace) i wykonać refetch
  - nie pokazywać toasta jako pierwszej reakcji (to jest problem query w URL)
- **`GET /api/plants` → 5xx / brak danych**:
  - toast „Nie udało się pobrać danych. Spróbuj ponownie.”
  - opcjonalny banner z przyciskiem „Spróbuj ponownie” (pattern z `DashboardView`)
- **`DELETE /api/plants/:id` → 401**:
  - redirect do logowania
- **`DELETE /api/plants/:id` → 404 / plant_not_found**:
  - toast neutralny (bez ujawniania czegokolwiek) + refetch listy
- **`DELETE /api/plants/:id` → 5xx**:
  - toast błędu, pozostaw dialog otwarty z możliwością ponowienia

### Przypadki brzegowe
- Usunięcie ostatniego elementu na stronie:
  - po refetch `pagination.totalPages` może się zmniejszyć; jeśli `page > totalPages`, UI powinien zjechać na `page = totalPages` (min 1) i wykonać ponowny refetch.
- Szybka zmiana query (race conditions):
  - w `usePlantsData` trzymać `latestQueryRef` (jak w `useDashboardData`) i ignorować przeterminowane odpowiedzi.

## 11. Kroki implementacji
1. **Dodać routing widoku**:
   - utworzyć `src/pages/app/plants.astro` (analogicznie do `dashboard.astro`) i dodać `PlantsListView client:load`.
2. **Dodać typy i viewmodel dla listy**:
   - utworzyć `src/lib/plants/plants-list-viewmodel.ts`:
     - `PlantsListQueryState`, `PLANTS_LIST_QUERY_DEFAULTS`
     - `buildPlantsListViewModel(...)` używający `mapPlantCardDto` do mapowania elementów
3. **Dodać `usePlantsQueryState`**:
   - skopiować pattern z `useDashboardQueryState`, dostosować typy i nazewnictwo.
4. **Dodać `usePlantsData`**:
   - skopiować pattern z `useDashboardData`:
     - `apiGet<PlantCardListItemDto[]>("/api/plants", query)`
     - zbudować `paginationVm` z `result.response.pagination`
     - zbudować `PlantsListViewModel`
5. **Dodać `PlantsListView`**:
   - obsłużyć redirect dla `authRequired` (401) na podstawie `initialUrl`
   - obsłużyć reset query przy `400`
   - zdefiniować stany `empty garden` i `no results` (jak w Dashboard)
6. **Zaimplementować toolbar**:
   - utworzyć `PlantsToolbar` (kopiując `DashboardToolbar` lub refaktorując do komponentu wspólnego)
   - upewnić się, że `search` ma walidację do 50 znaków i reset page=1 na istotne zmiany
7. **Zaimplementować render listy + sekcje**:
   - dodać `PlantsListContent`:
     - skeletony na first-load
     - sekcje wg pilności (tylko gdy `sort="priority"`) lub lista płaska dla innych sortów
8. **Rozszerzyć `PlantCard` o wymagania listy**:
   - dodać wyświetlanie `iconKey` + `colorHex`
   - dodać kolorowanie terminów zgodnie z `dueDatesTone` (US-020)
   - dodać menu mobile (US-032) z akcjami „Edytuj” i „Usuń”
9. **Dodać potwierdzenie usuwania**:
   - stworzyć `ConfirmDeletePlantDialog`
   - dodać wywołanie `DELETE /api/plants/:id`
   - po sukcesie: toast + refetch + korekta paginacji (jeśli potrzeba)
10. **Ujednolicić warstwę API (opcjonalnie, rekomendowane)**:
   - rozbudować `src/lib/api/api-client.ts` o `apiDelete` (i ewentualnie `apiPut`) dla spójności.
11. **Sprawdzenie UX/A11y**:
   - menu mobile dostępne bez hover, focus/ESC w dialogach
   - kolory statusów wspierane tekstem (badge + treść), nie tylko kolor
   - linki i przyciski mają czytelne etykiety (w tym `aria-label` dla ikony menu)
