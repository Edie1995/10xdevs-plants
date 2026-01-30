# Plan implementacji widoku Szczegóły rośliny

## 1. Przegląd
Widok „Szczegóły rośliny” służy do pełnego podglądu i zarządzania pojedynczą kartą rośliny w układzie zakładek: **Podstawowe / Harmonogram / Choroby / Historia**. Widok zawiera:
- nagłówek z identyfikacją (ikona/kolor), nazwą, statusem i terminami,
- globalne akcje: **quick actions** (podlej/nawóź + backdating), „Edytuj” (w kontekście zakładki), „Usuń”,
- obsługę bezpieczeństwa: użytkownik ma dostęp tylko do własnych danych (próba wejścia na cudzą roślinę ma dać ekran 404‑like).

Kluczowe cele wynikające z PRD/US:
- **US-023**: widok pokazuje wszystkie pola karty, harmonogram i ostatnie działania; daty w formacie `DD.MM.RRRR`.
- **US-036**: ochrona przed dostępem do cudzych danych (brak ujawnienia, czy zasób istnieje).

## 2. Routing widoku
- **Ścieżka**: `/app/plants/:id?tab=basic|schedule|diseases|history`
- **Plik strony (Astro)**: `src/pages/app/plants/[id].astro` (nowy)
  - renderuje layout (`src/layouts/Layout.astro`) i mountuje klientowy kontener React (`client:load`),
  - przekazuje do React: `plantId` (z parametru ścieżki), `initialUrl` (dla redirectów auth), `tab` (z query) i opcjonalnie `returnTo` (z query).

Zasady routingu:
- `tab` domyślnie: `basic` (gdy brak parametru lub niepoprawny).
- `returnTo` (opcjonalnie): zakodowany URL powrotu na listę (`/app/plants?...`). Jeśli brak, widok próbuje użyć `document.referrer` (tylko ten sam origin), a finalnie fallback do `/app/plants` z zachowaniem query, jeśli jest znane.

## 3. Struktura komponentów
Proponowane pliki/komponenty (React):
- `src/components/plants/PlantView.tsx` (nowy) – kontener całego widoku
- `src/components/plants/PlantBackLink.tsx` (nowy)
- `src/components/plants/PlantHeader.tsx` (nowy)
- `src/components/plants/PlantTabs.tsx` (nowy)
- `src/components/plants/tabs/PlantBasicTab.tsx` (nowy)
- `src/components/plants/tabs/PlantScheduleTab.tsx` (nowy)
- `src/components/plants/tabs/PlantDiseasesTab.tsx` (nowy)
- `src/components/plants/tabs/PlantHistoryTab.tsx` (nowy; na MVP może używać `recent_care_logs` z detalu)
- (reuse) `src/components/plants/QuickActions.tsx`
- (reuse) `src/components/plants/BackdateCareActionModal.tsx`
- (reuse) `src/components/plants/ConfirmDeletePlantDialog.tsx`
- (reuse, częściowo) sekcje formularza: `PlantBasicsSection`, `PlantInstructionsSection`, `PlantIdentificationSection`, a dla harmonogramu/chorób – istniejące „section”/„row” komponenty jako baza UI.

Wysokopoziomowy diagram drzewa komponentów:

```
Layout.astro
└─ [id].astro
   └─ PlantView (client:load)
      ├─ PlantBackLink
      ├─ PlantHeader
      │  ├─ (identyfikacja: ikona/kolor)
      │  ├─ (status + terminy)
      │  ├─ QuickActions (+ BackdateCareActionModal)
      │  └─ (akcje: Edytuj / Usuń)
      ├─ PlantTabs
      │  ├─ PlantBasicTab
      │  ├─ PlantScheduleTab
      │  ├─ PlantDiseasesTab
      │  └─ PlantHistoryTab
      └─ ConfirmDeletePlantDialog
```

## 4. Szczegóły komponentów

### PlantView
- **Opis komponentu**: klientowy „page container”. Odpowiada za:
  - odczyt `plantId`, `tab`, `returnTo`,
  - pobranie danych rośliny (`GET /api/plants/:id`) i dystrybucję do nagłówka/zakładek,
  - obsługę stanu globalnego (loading/error/404‑like),
  - orchestrację mutacji (update plant, update schedules, add disease, delete plant) oraz odświeżeń.
- **Główne elementy**:
  - `<main>` z max width (spójne z listą: `max-w-5xl px-6 py-8`),
  - sekcja nagłówka + zakładki,
  - globalny `ConfirmDeletePlantDialog`.
- **Obsługiwane zdarzenia**:
  - `onTabChange(tab)` → update query `tab` bez pełnego reloadu,
  - `onEditCurrentTab()` → przełącza aktualną zakładkę w tryb edycji,
  - `onDeleteRequested()` → otwiera dialog usuwania,
  - `onDeleted()` → redirect do `returnTo` lub `/app/plants` + (opcjonalnie) toast.
- **Walidacja**:
  - `plantId` musi być UUID (frontend: walidacja lekka; backend już waliduje i zwraca `400 invalid_id`/`validation_error`).
  - `tab` tylko z zestawu `basic|schedule|diseases|history` (inne → fallback do `basic`).
- **Typy (DTO i ViewModel)**:
  - DTO: `PlantCardDetailDto` (z `src/types.ts`)
  - VM: `PlantDetailVM` (nowy, patrz sekcja 5)
  - błąd: `ApiErrorViewModel` (z `src/lib/api/api-client.ts`)
- **Propsy**:

```ts
export interface PlantViewProps {
  plantId: string;
  initialUrl: string;
  initialTab?: PlantTabKey;
  returnTo?: string | null;
}
```

### PlantBackLink
- **Opis komponentu**: renderuje link „Wróć” do poprzedniego widoku listy z zachowaniem query.
- **Główne elementy**:
  - `<a>` lub `Button` w wariancie link (Shadcn) z ikoną strzałki.
- **Obsługiwane zdarzenia**:
  - klik → nawigacja do:
    - `returnTo` (jeśli poprawny i z tego samego origin),
    - else `document.referrer` (jeśli pasuje do `/app/plants`),
    - else `/app/plants`.
- **Walidacja**:
  - `returnTo` musi być bezpieczny (tylko ten sam origin; bez protokołu zewnętrznego).
- **Typy**:
  - `ReturnToInfoVM` (opcjonalny nowy typ pomocniczy).
- **Propsy**:

```ts
export interface PlantBackLinkProps {
  returnTo?: string | null;
  fallbackHref?: string; // default "/app/plants"
}
```

### PlantHeader
- **Opis komponentu**: nagłówek rośliny: identyfikacja, nazwa, status, terminy, quick actions, akcje globalne.
- **Główne elementy**:
  - avatar/ikona z tłem `colorHex`,
  - nazwa + badge statusu,
  - terminy (podlewanie/nawożenie) w formacie `DD.MM.RRRR`,
  - `QuickActions` (działania dziś + przytrzymanie = backdating),
  - przyciski: „Edytuj” (kontekst zakładki) i „Usuń” (otwiera dialog).
- **Obsługiwane zdarzenia**:
  - `onEdit()` – deleguje do rodzica,
  - `onDelete()` – deleguje do rodzica,
  - `QuickActions.onSuccess` → odśwież dane rośliny (terminy/status),
  - `QuickActions.onError` → obsługa błędów (patrz sekcja 10).
- **Walidacja**:
  - brak (prezentacja), ale ma blokady akcji:
    - quick actions zablokowane, gdy harmonogram `missing|incomplete` (wykorzystać `usePlantSchedulesCache`).
    - nawożenie disabled, gdy `fertilizing_interval=0` dla bieżącego sezonu (logika już w `QuickActions`).
- **Typy**:
  - `PlantHeaderVM` (nowy, patrz sekcja 5)
  - `PlantScheduleStateVM` (istniejący, `src/lib/dashboard/dashboard-viewmodel.ts`)
- **Propsy**:

```ts
export interface PlantHeaderProps {
  plant: PlantHeaderVM;
  scheduleState: PlantScheduleStateVM;
  onLoadSchedule: () => Promise<PlantScheduleStateVM>;
  onCareActionCompleted: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onNavigateToSchedule: () => void;
  onApiError: (error: ApiErrorViewModel) => void;
}
```

### PlantTabs
- **Opis komponentu**: przełącznik zakładek (desktop: tablist; mobile: scrollable tabs lub dropdown).
- **Główne elementy**:
  - Tab list (ARIA) lub `Select` w mobile,
  - slot na zawartość aktywnej zakładki.
- **Obsługiwane zdarzenia**:
  - `onTabChange(next)` → aktualizacja query w URL.
- **Walidacja**:
  - jw. `tab` musi być z enumeracji.
- **Typy**:
  - `PlantTabKey = "basic" | "schedule" | "diseases" | "history"`
- **Propsy**:

```ts
export interface PlantTabsProps {
  activeTab: PlantTabKey;
  onTabChange: (tab: PlantTabKey) => void;
  tabs: Array<{ key: PlantTabKey; label: string }>;
}
```

### PlantBasicTab
- **Opis komponentu**: zakładka „Podstawowe”: podgląd i edycja pól karty rośliny (bez oddzielnego CRUD chorób/harmonogramu).
- **Główne elementy**:
  - tryb podglądu: sekcje z wartościami + neutralne puste pola,
  - tryb edycji: reuse `PlantBasicsSection`, `PlantInstructionsSection`, `PlantIdentificationSection` (jeśli istnieje w projekcie) + przyciski „Zapisz/Anuluj”.
- **Obsługiwane zdarzenia**:
  - `onEnterEdit()`, `onCancelEdit()`,
  - `onSubmit()` → `PUT /api/plants/:id`.
- **Walidacja (zgodna z API `PUT /api/plants/:id`)**:
  - `name` (jeśli podane): `trim`, `min(1)`, `max(50)`,
  - `soil`: `max(200)`,
  - `pot`: `max(200)`,
  - `position`: `max(50)`,
  - `difficulty`: enum `"easy"|"medium"|"hard"`,
  - instrukcje/notatki: `max(2000)` każde,
  - `icon_key`: `max(50)`,
  - `color_hex`: regex `^#[0-9A-Fa-f]{6}$`.
  - UX: walidacja inline; toast tylko dla błędów ogólnych.
- **Typy**:
  - DTO: `PlantCardDetailDto`, `PlantCardUpdateCommand`
  - VM: `PlantBasicTabVM`, `PlantEditFormValues`, `PlantEditFormErrors` (nowe)
- **Propsy**:

```ts
export interface PlantBasicTabProps {
  plant: PlantCardDetailDto;
  mode: "read" | "edit";
  onSubmit: (command: PlantCardUpdateCommand) => Promise<void>;
  onCancel: () => void;
  onModeChange: (mode: "read" | "edit") => void;
}
```

### PlantScheduleTab
- **Opis komponentu**: zakładka „Harmonogram”: podgląd i edycja czterech sezonów w jednym zapisie.
- **Główne elementy**:
  - tryb podglądu: tabela 4×2 (sezon × podlewanie/nawożenie),
  - tryb edycji:
    - desktop: tabela z inputami liczbowymi,
    - mobile: akordeon per sezon (reuse `SeasonScheduleRow`, jeśli pasuje).
  - przyciski: „Zapisz/Anuluj”.
- **Obsługiwane zdarzenia**:
  - `onEnterEdit`, `onCancelEdit`,
  - `onSubmit()` → `PUT /api/plants/:id/schedules`,
  - `onSuccess()` → zaktualizuj `usePlantSchedulesCache` (ustaw `ready` + nowe schedules) oraz odblokuj quick actions.
- **Walidacja (zgodna z API `PUT /api/plants/:id/schedules`)**:
  - wysyłamy **zawsze komplet 4 sezonów** (`spring|summer|autumn|winter`) – to wymaganie UX z UI planu,
  - każdy sezon:
    - `watering_interval`: int `0..365`,
    - `fertilizing_interval`: int `0..365` (0 = wyłącza nawożenie w tym sezonie),
  - unikalność sezonów (frontend: blokada duplikatów; backend może zwrócić `409 duplicate_season`).
  - „pola liczbowe tylko cyfry” (PRD): inputy typu number + własna sanitizacja/guard na `onChange` (tylko cyfry, brak `e`, `+`, `-`).
- **Typy**:
  - DTO: `SeasonalScheduleDto`, `UpdateSchedulesCommand`
  - VM: `PlantSchedulesFormValues`, `PlantSchedulesFormErrors` (nowe)
- **Propsy**:

```ts
export interface PlantScheduleTabProps {
  plantId: string;
  schedules: SeasonalScheduleDto[];
  mode: "read" | "edit";
  onSubmit: (command: UpdateSchedulesCommand) => Promise<void>;
  onCancel: () => void;
  onModeChange: (mode: "read" | "edit") => void;
}
```

### PlantDiseasesTab
- **Opis komponentu**: zakładka „Choroby”: lista akordeonowa wpisów chorób + dodawanie nowych wpisów.
- **Główne elementy**:
  - lista (accordion) z wpisami,
  - formularz „Dodaj chorobę” (inline) – minimalnie `name` + opcjonalnie `symptoms`, `advice`,
  - na MVP można ograniczyć się do `GET` + `POST` (zgodnie z dostarczoną implementacją endpointów), a edycję/usuwanie dopisać później (UI plan przewiduje PUT/DELETE).
- **Obsługiwane zdarzenia**:
  - `onLoad()` → `GET /api/plants/:id/diseases` (lazy: tylko gdy tab aktywny),
  - `onAdd()` → `POST /api/plants/:id/diseases`,
  - (przyszłe) `onUpdate(diseaseId)` → `PUT .../diseases/:diseaseId`,
  - (przyszłe) `onDelete(diseaseId)` → `DELETE .../diseases/:diseaseId`.
- **Walidacja (zgodna z API)**:
  - `name`: `trim`, `min(1)`, `max(50)`,
  - `symptoms`: opcjonalne, `trim`, `max(2000)`, pusty string → `null/undefined`,
  - `advice`: opcjonalne, `trim`, `max(2000)`, pusty string → `null/undefined`.
- **Typy**:
  - DTO: `DiseaseDto`, `DiseaseCommand`
  - VM: `PlantDiseasesVM`, `DiseaseFormValues`, `DiseaseFormErrors` (nowe)
- **Propsy**:

```ts
export interface PlantDiseasesTabProps {
  plantId: string;
  initialDiseases?: DiseaseDto[]; // opcjonalnie z GET /api/plants/:id
}
```

### PlantHistoryTab
- **Opis komponentu**: zakładka „Historia”: lista ostatnich działań pielęgnacyjnych.
- **MVP**:
  - bazuje na `recent_care_logs` z `GET /api/plants/:id` (limit 5 w backendzie),
  - format dat `DD.MM.RRRR`,
  - empty state „Brak historii — użyj QuickActions”.
- **Rozszerzenie** (gdy dostępny endpoint `GET /api/plants/:id/care-actions`):
  - obsługa filtra typu akcji + limit/paginacja wg API planu.
- **Typy**:
  - DTO: `CareLogDto`
  - VM: `CareLogVM` (opcjonalny)
- **Propsy**:

```ts
export interface PlantHistoryTabProps {
  recent: CareLogDto[];
}
```

### ConfirmDeletePlantDialog (reuse)
- **Opis**: dialog potwierdzający usunięcie rośliny (`DELETE /api/plants/:id`).
- **Zdarzenia**:
  - `onDeleted` → w `PlantView` redirect do listy/returnTo.
- **Walidacja**:
  - blokada double submit (już w komponencie).

## 5. Typy
Wykorzystywane DTO (już istnieją w `src/types.ts`):
- `PlantCardDetailDto` – główne dane widoku (plant + `diseases`, `schedules`, `recent_care_logs`)
- `PlantCardUpdateCommand` – payload dla `PUT /api/plants/:id`
- `SeasonalScheduleDto` – schedules z API
- `UpdateSchedulesCommand` – payload dla `PUT /api/plants/:id/schedules` (pole `schedules`)
- `DiseaseDto` – wpis choroby
- `DiseaseCommand` – payload dla `POST /api/plants/:id/diseases`
- `ApiResponseDto<T>` + `ApiErrorDto` – envelope API

Nowe typy ViewModel (rekomendowane do dodania, aby odseparować DTO od UI):

### PlantTabKey
```ts
export type PlantTabKey = "basic" | "schedule" | "diseases" | "history";
```

### PlantHeaderVM
Źródło: `PlantCardDetailDto` (pola z `plant_card`) + mapowanie statusu/terminów analogiczne do `mapPlantCardDto`.

Pola:
- `id: string`
- `name: string`
- `iconKey: string | null`
- `colorHex: string | null`
- `statusPriority: 0 | 1 | 2`
- `statusLabel: "Pilne" | "Na dziś" | "OK"`
- `statusTone: "danger" | "warning" | "neutral"`
- `nextWateringDisplay: string` (format `DD.MM.RRRR` albo np. „—”)
- `nextFertilizingDisplay: string`
- `links`:
  - `detailsHref: string` (np. `/app/plants/${id}?tab=basic`)
  - `scheduleHref: string` (np. `/app/plants/${id}?tab=schedule`)

### PlantDetailVM
Agreguje dane całego widoku:
- `header: PlantHeaderVM`
- `plant: PlantCardDetailDto` (lub rozbicie na sekcje read view)
- `tabs`:
  - `basic`: dane do podglądu/edycji
  - `schedule`: `SeasonalScheduleDto[]`
  - `diseases`: `DiseaseDto[]`
  - `history`: `CareLogDto[]` (na MVP: `recent_care_logs`)

### PlantEditFormValues / PlantEditFormErrors (dla zakładki „Podstawowe”)
Rekomendacja: wydzielić wspólny typ na bazie pól edytowalnych w `PlantCardUpdateCommand`, zamiast używać 1:1 `NewPlantFormValues`.

`PlantEditFormValues`:
- `name: string`
- `soil?: string`
- `pot?: string`
- `position?: string`
- `difficulty?: DifficultyLevel | null`
- `watering_instructions?: string`
- `repotting_instructions?: string`
- `propagation_instructions?: string`
- `notes?: string`
- `icon_key?: string`
- `color_hex?: string`

`PlantEditFormErrors`:
- `form?: string`
- `fields?: Partial<Record<keyof PlantEditFormValues, string>>`

### PlantSchedulesFormValues / PlantSchedulesFormErrors
`PlantSchedulesFormValues`:
- `schedules: Array<{ season: Season; watering_interval: number; fertilizing_interval: number }>` (zawsze 4)

`PlantSchedulesFormErrors`:
- `form?: string`
- `seasons?: Partial<Record<Season, { watering_interval?: string; fertilizing_interval?: string }>>`

### DiseaseFormValues / DiseaseFormErrors
`DiseaseFormValues`:
- `name: string`
- `symptoms?: string`
- `advice?: string`

`DiseaseFormErrors`:
- `form?: string`
- `fields?: { name?: string; symptoms?: string; advice?: string }`

## 6. Zarządzanie stanem
Zalecany podział:
- **Stan routingu** (URL):
  - `tab` – źródło prawdy w query string.
  - `returnTo` – opcjonalnie w query string (przekazywany z listy).
- **Stan danych**:
  - `plantDetail`: `PlantCardDetailDto | null`
  - `isLoadingPlant`, `plantError: ApiErrorViewModel | null`
- **Stan zakładek**:
  - `basicMode: "read"|"edit"`
  - `scheduleMode: "read"|"edit"`
  - `diseasesMode` (opcjonalnie – np. read + add form)
- **Stan formularzy**:
  - `basicFormValues`, `basicFormErrors`, `isSavingBasic`
  - `scheduleFormValues`, `scheduleFormErrors`, `isSavingSchedule`
  - `diseaseFormValues`, `diseaseFormErrors`, `isSavingDisease`
- **Stan dialogów**:
  - `deleteDialogOpen: boolean`
- **Cache harmonogramu dla quick actions**:
  - reuse `usePlantSchedulesCache()` – w `PlantView` pobrać `scheduleState = getState(plantId)` i używać w `PlantHeader/QuickActions`.

Custom hooki (rekomendowane):
- `usePlantTabState()` – czyta/ustawia `tab` w URL (analogicznie do `usePlantsQueryState`).
- `usePlantDetailData(plantId)` – pobiera `GET /api/plants/:id`, mapuje `401` do `authRequired`, mapuje `404` do stanu „not found”.
- `useUpdatePlant(plantId)` – wykonuje `PUT /api/plants/:id` + mapuje `400 validation_error` do błędów inline.
- `usePlantDiseases(plantId)` – lazy fetch `GET /api/plants/:id/diseases` + `POST` (na MVP).
- `useUpdateSchedules(plantId)` – `PUT /api/plants/:id/schedules` + mapowanie błędów `409 duplicate_season`, `400 validation_error`.

## 7. Integracja API
Wszystkie wywołania używają wspólnego klienta `src/lib/api/api-client.ts` (`apiGet`, `apiPost`, `apiDelete`) z `credentials: "include"`.

### GET /api/plants/:id
- **Cel**: baza danych widoku (header + basic + (opcjonalnie) initial diseases/schedules + `recent_care_logs`).
- **Request**: brak body.
- **Response DTO**: `ApiResponseDto<PlantCardDetailDto>`
- **Użycie w UI**:
  - na wejściu do widoku: load + skeleton,
  - `404 plant_not_found` → ekran 404‑like (CTA do `/app/plants`),
  - `401 unauthorized` → redirect do `/auth/login?redirectTo=<current>`.

### PUT /api/plants/:id
- **Cel**: zapis edycji zakładki „Podstawowe”.
- **Request DTO**: `PlantCardUpdateCommand`
- **Response DTO**: `ApiResponseDto<PlantCardDetailDto>`
- **Obsługa `400 validation_error`**:
  - backend zwraca `details` z `fieldErrors/formErrors` (flatten Zod). Frontend mapuje do `PlantEditFormErrors`.
- **Obsługa `409 duplicate_season`**:
  - możliwa, jeśli UI wysyła `schedules` także w tym endpointcie; w tym widoku rekomendacja: **nie** aktualizować schedules przez `PUT /api/plants/:id` (zostawić to zakładce harmonogramu), by uprościć.

### GET /api/plants/:id/schedules
- **Cel**: quick actions + zakładka harmonogramu (źródło prawdy per sezon).
- **Response DTO**: `ApiResponseDto<SeasonalScheduleDto[]>`
- **Zachowanie**:
  - wykorzystać `usePlantSchedulesCache` (TTL 5 min) dla spójności z listą.
  - `500 schedule_incomplete` mapowane w cache na status `incomplete` (blokuje quick actions).

### PUT /api/plants/:id/schedules
- **Cel**: zapis 4 sezonów.
- **Request DTO**: `UpdateSchedulesCommand`
- **Response DTO**: `ApiResponseDto<SeasonalScheduleDto[]>`
- **Ważne**:
  - UI zawsze wysyła wszystkie 4 sezony.
  - po sukcesie: `usePlantSchedulesCache.setState(plantId, { status: "ready", schedules: data, lastCheckedAt: now })`.

### GET /api/plants/:id/diseases
- **Cel**: pobranie listy chorób do zakładki.
- **Response DTO**: `ApiResponseDto<DiseaseDto[]>`

### POST /api/plants/:id/diseases
- **Cel**: dodanie nowej choroby.
- **Request DTO**: `DiseaseCommand`
- **Response DTO**: `ApiResponseDto<DiseaseDto>`
- **Obsługa `400 invalid_body`**:
  - mapować `details` do błędów pól formularza dodawania.

### DELETE /api/plants/:id
- **Cel**: usunięcie rośliny.
- **Response DTO**: `ApiResponseDto<null>` + `message`
- **Zachowanie** (jak w istniejącym `ConfirmDeletePlantDialog`):
  - `401` → redirect login,
  - `403/404/plant_not_found` → toast neutralny + zamknięcie dialogu + powrót/odśwież,
  - `500` → toast error.

## 8. Interakcje użytkownika
- **Wejście w widok**:
  - użytkownik klika „Szczegóły” na karcie → przejście na `/app/plants/:id?tab=basic`.
- **Zmiana zakładki**:
  - klik w tab → zmiana `tab` w URL + lazy load danych zakładki (np. diseases).
- **Quick actions**:
  - klik „Podlano dziś” / „Nawożono dziś” → zapis akcji + toast sukcesu + odświeżenie detalu (terminy/status),
  - przytrzymanie (500ms) → otwarcie modala wyboru daty → zapis backdate.
- **Edycja zakładki**:
  - klik „Edytuj” w nagłówku → przełącza aktywną zakładkę w tryb edycji.
- **Zapis/Anuluj**:
  - „Zapisz” → walidacja frontend + request API,
  - „Anuluj” → cofnięcie zmian w formularzu bez zapisu.
- **Dodanie choroby**:
  - w zakładce chorób: wypełnienie formularza + „Dodaj” → `POST` → dopięcie do listy bez resetu scrolla.
- **Usuwanie rośliny**:
  - klik „Usuń” → modal potwierdzenia → `DELETE` → toast + redirect do listy.

## 9. Warunki i walidacja
Warunki wynikające z API i jak wpływają na UI:
- **Autoryzacja (`401`)**:
  - dotyczy wszystkich requestów; UI robi redirect do `/auth/login?redirectTo=<currentUrl>`.
- **Brak dostępu/nie istnieje (`404 plant_not_found`)**:
  - UI pokazuje ekran 404‑like + CTA do `/app/plants`. Nie pokazujemy rozróżnienia 403 vs 404 (backend już maskuje 403 jako 404 w `GET /api/plants/:id`).
- **Walidacje pól (400)**:
  - `PUT /api/plants/:id`: inline błędy na polach; nie tracimy danych formularza (PRD US-033).
  - `PUT /api/plants/:id/schedules`: inline błędy per sezon i per pole (0..365, int).
  - `POST /api/plants/:id/diseases`: inline błędy formularza dodawania (name wymagane, max długości).
- **Duplikat sezonu (`409 duplicate_season`)**:
  - UI powinien konstrukcyjnie uniemożliwić duplikaty (trzymamy stałą listę 4 sezonów), ale jeśli dojdzie do błędu, pokazać błąd formularza harmonogramu.
- **Blokady quick actions**:
  - `scheduleState.status in ("missing","incomplete")` → disable przycisków + CTA „Ustaw harmonogram” (nawiguje do `?tab=schedule`).
  - `fertilizing_interval=0` dla bieżącego sezonu → przycisk nawożenia disabled + tooltip (już w `QuickActions`).
- **Daty**:
  - UI wszędzie prezentuje daty jako `DD.MM.RRRR` (wykorzystać `formatDisplayDate`/narzędzia z `src/lib/date`).
  - Modal backdating: data nie może być przyszła (już walidowane w `BackdateCareActionModal`).

## 10. Obsługa błędów
Scenariusze błędów + reakcje UI:
- **GET /api/plants/:id**
  - `401` → redirect login,
  - `404 plant_not_found` → 404‑like,
  - `>=500` → PageError z CTA „Spróbuj ponownie” (bez pętli toastów).
- **PUT /api/plants/:id**
  - `400 validation_error` → inline błędy pól + zachowanie wartości,
  - `401` → redirect,
  - `404` → przejście na 404‑like (zasób usunięty / brak dostępu),
  - `>=500` → toast „Nie udało się zapisać. Spróbuj ponownie.”
- **GET/PUT schedules**
  - `500 schedule_incomplete` → stan „incomplete”: blokada akcji + komunikat w headerze i w zakładce harmonogramu,
  - `404` → traktować jako brak harmonogramu (cache `missing`), CTA do ustawienia.
- **GET/POST diseases**
  - `400 invalid_body` → inline errors,
  - `404` → 404‑like (plant missing),
  - `>=500` → toast + możliwość ponowienia.
- **DELETE plant**
  - zachowanie jak w `ConfirmDeletePlantDialog` (neutralny toast dla 403/404, redirect po usunięciu).

Zasada spójności toastów:
- sukcesy: krótki toast (3s) dla zapisów/mutacji,
- błędy walidacyjne: inline przy polach,
- błędy serwera: toast + możliwość retry (lub PageError, jeśli dotyczy wejścia na widok).

## 11. Kroki implementacji
1. **Routing strony**
   - dodać `src/pages/app/plants/[id].astro`,
   - wyciągnąć `plantId` z `Astro.params.id`,
   - wyciągnąć `tab` i `returnTo` z `Astro.url.searchParams`,
   - zrenderować `Layout` + `PlantView client:load`.
2. **Kontrakt tabów i nawigacja**
   - dodać typ `PlantTabKey`,
   - zaimplementować `PlantTabs` + logikę aktualizacji query `tab`.
3. **Pobieranie danych detalu**
   - stworzyć hook `usePlantDetailData(plantId)` oparty o `apiGet<PlantCardDetailDto>(/api/plants/${id})`,
   - obsłużyć `authRequired` (jak w `PlantsListView`),
   - dodać stany: skeleton, 404‑like, server error.
4. **Nagłówek + quick actions**
   - dodać `PlantHeader` i mapowanie `PlantCardDetailDto → PlantHeaderVM`,
   - wpiąć `usePlantSchedulesCache` dla `scheduleState`,
   - podłączyć `QuickActions`:
     - `onSuccess`: refetch detalu (`GET /api/plants/:id`) i ewentualnie odświeżenie listy po powrocie,
     - `onNavigateToSchedule`: ustawić `tab=schedule`.
5. **BackLink**
   - dodać `PlantBackLink`:
     - preferuj `returnTo`,
     - fallback do `/app/plants`.
   - (opcjonalnie) zaplanować zmianę generowania linków na liście, aby dopisywać `returnTo` przy nawigacji do detalu.
6. **Zakładka Podstawowe (read + edit)**
   - zbudować `PlantBasicTab`:
     - read view: prezentacja wszystkich pól + neutralne puste wartości,
     - edit view: reuse istniejących sekcji formularza (lub wyodrębnienie wspólnych komponentów),
   - dodać hook `useUpdatePlant` (PUT) + mapowanie `400 validation_error` do `PlantEditFormErrors`.
7. **Zakładka Harmonogram**
   - `PlantScheduleTab`:
     - źródło danych: `usePlantSchedulesCache.getOrLoad(plantId)` (przy wejściu w tab),
     - edycja: 4 sezony zawsze obecne,
     - PUT `/api/plants/:id/schedules`,
     - po sukcesie: aktualizacja cache + przełączenie w read mode.
8. **Zakładka Choroby**
   - `PlantDiseasesTab`:
     - lazy fetch `GET /api/plants/:id/diseases` po wejściu w tab (chyba że używamy danych z detalu jako initial state),
     - formularz dodawania + POST,
     - po sukcesie: dopięcie nowej pozycji do listy (bez refetch) lub refetch (prostsze, mniej optymalne).
9. **Zakładka Historia (MVP)**
   - `PlantHistoryTab` renderuje `recent_care_logs` z detalu; format dat `DD.MM.RRRR`,
   - przygotować rozszerzenie pod pełny endpoint historii (jeśli/when dostępny).
10. **Usuwanie rośliny**
   - podłączyć `ConfirmDeletePlantDialog` w `PlantView`,
   - `onDeleted`: redirect do `returnTo` lub `/app/plants` (zachowując query, jeśli jest znane).
11. **Spójność UX/A11y**
   - zakładki z ARIA (`role="tablist"` itd.) lub `Select` na mobile,
   - modale: focus trap (Shadcn `Dialog`),
   - statusy nie tylko kolorem: badge + tekst,
   - daty: konsekwentnie `DD.MM.RRRR`.
