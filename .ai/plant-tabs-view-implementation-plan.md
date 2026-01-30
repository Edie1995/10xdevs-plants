## Plan implementacji widoku Szczegóły rośliny – zakładki (Podstawowe / Harmonogram / Choroby / Historia)

## 1. Przegląd
Widok „Szczegóły rośliny” umożliwia:
- podgląd i edycję danych karty rośliny (zakładka **Podstawowe**),
- podgląd i edycję sezonowego harmonogramu podlewania/nawożenia (zakładka **Harmonogram**),
- zarządzanie chorobami rośliny (CRUD) w formie akordeonu (zakładka **Choroby**),
- przegląd historii działań pielęgnacyjnych z filtrem (zakładka **Historia**).

Widok korzysta z Astro + React oraz komponentów Shadcn/ui, a komunikaty użytkownika realizuje przez `sonner` (toasty). Dane są prywatne – brak dostępu do cudzych roślin ma skutkować zachowaniem „404-like” po stronie UI.

## 2. Routing widoku
- **Ścieżka**: `/app/plants/:id`
- **Zakładka**: query param `tab` (opcjonalny)
  - Podstawowe: `/app/plants/:id?tab=basic`
  - Harmonogram: `/app/plants/:id?tab=schedule`
  - Choroby: `/app/plants/:id?tab=diseases`
  - Historia: `/app/plants/:id?tab=history`
- **Powrót**: query param `returnTo` (opcjonalny) – powrót do listy roślin z zachowaniem kontekstu.

Uwagi implementacyjne:
- Routing już istnieje w `src/pages/app/plants/[id].astro` (parsowanie `tab` oraz `returnTo`).
- Zmiana zakładki powinna aktualizować URL (pushState) i obsługiwać back/forward (popstate) – zapewnia to `usePlantTabState`.

## 3. Struktura komponentów
Wysokopoziomowe drzewo komponentów (React):

```text
PlantView
├─ PlantBackLink
├─ PlantHeader
│  └─ QuickActions
│     └─ BackdateCareActionModal
├─ PlantTabs
└─ PlantTabPanel (switch po activeTab)
   ├─ PlantBasicTab
   │  ├─ PlantBasicReadView
   │  └─ PlantBasicEditForm
   │     ├─ PlantBasicsSection (reuse)
   │     ├─ PlantIdentificationSection (reuse)
   │     ├─ PlantInstructionsSection (reuse)
   │     └─ FormActions (reuse / dopasowanie)
   ├─ PlantScheduleTab
   │  ├─ PlantScheduleReadView (tabela/summary)
   │  └─ PlantScheduleEditForm
   │     ├─ PlantScheduleGrid (desktop)
   │     └─ PlantScheduleAccordion (mobile)
   │        └─ SeasonScheduleRow (reuse)
   ├─ PlantDiseasesTab
   │  ├─ DiseaseAddPanel
   │  └─ DiseaseAccordion
   │     └─ DiseaseAccordionItem (xN)
   │        ├─ DiseaseReadView
   │        ├─ DiseaseEditForm
   │        └─ InlineDeleteConfirmButton
   └─ PlantHistoryTab
      ├─ CareActionsFilter
      └─ CareActionsList
         └─ CareActionRow (xN)
```

## 4. Szczegóły komponentów

### `PlantView` (istniejący, do rozbudowy)
- **Plik**: `src/components/plants/PlantView.tsx`
- **Cel**: kontener widoku szczegółów; pobiera `PlantCardDetailDto`, renderuje nagłówek, zakładki i panel aktywnej zakładki.
- **Główne elementy**:
  - `<main>` + wrapper layout
  - `PlantHeader` (nagłówek + quick actions)
  - `PlantTabs` (zmiana `tab`)
  - `PlantTabPanel` (NOWE) – renderuje treść zakładki
- **Obsługiwane zdarzenia**:
  - `onTabChange(tab)` → `usePlantTabState().setTab(tab)`
  - `PlantHeader.onEdit()` → przełącza na `basic` i uruchamia tryb edycji zakładki podstawowej
  - `PlantHeader.onNavigateToSchedule()` → `setTab("schedule")`
  - `ConfirmDeletePlantDialog` events (już istnieją)
- **Warunki/walidacja**:
  - jeśli `authRequired` → redirect do logowania (już jest)
  - jeśli `notFound` → empty state 404-like (już jest)
  - błędy 5xx → ekran błędu + retry (już jest)
- **Typy**:
  - `PlantTabKey`, `PlantCardDetailDto`, `ApiErrorViewModel`, `PlantScheduleStateVM`
- **Propsy**:

```ts
export interface PlantViewProps {
  plantId: string;
  initialUrl: string;
  initialTab?: PlantTabKey;
  returnTo?: string | null;
}
```

**Zmiany wymagane w `PlantView`:**
- Dodać `PlantTabPanel` i przekazać mu:
  - `plantId`
  - `plantDetail` (`PlantCardDetailDto`)
  - `isLoading` / `error` (dla skeletonów/disabled)
  - `onApiError` (spójne traktowanie 401/404)
  - `onPlantUpdated` (callback, zwykle `refetch`)
  - `scheduleState` + `getOrLoad` + `setState` (dla zakładki harmonogram oraz spójności quick actions)
- Dodać stan „edit mode” zakładki podstawowej sterowany z nagłówka:
  - `const [basicEditMode, setBasicEditMode] = useState(false)`
  - `onEdit` w `PlantHeader` → `setTab("basic"); setBasicEditMode(true);`

### `PlantTabPanel` (nowy)
- **Cel**: proste przełączanie widoków zakładek bez remountowania całego `PlantView`.
- **Główne elementy**: switch po `activeTab`, render dokładnie jednej zakładki.
- **Obsługiwane zdarzenia**: delegowane do zakładek (submit, cancel, add, edit, delete, filter).
- **Typy**: `PlantTabKey`, `PlantCardDetailDto`, `PlantScheduleStateVM`, `ApiErrorViewModel`.
- **Propsy (interfejs)**:

```ts
export interface PlantTabPanelProps {
  activeTab: PlantTabKey;
  plantId: string;
  plantDetail: PlantCardDetailDto | null;
  isLoading: boolean;
  onPlantUpdated: () => void; // np. refetch()
  onApiError: (error: ApiErrorViewModel) => void;
  scheduleState: PlantScheduleStateVM;
  loadSchedule: () => Promise<PlantScheduleStateVM>;
  setScheduleState: (next: PlantScheduleStateVM) => void;
  basicEditMode: boolean;
  setBasicEditMode: (next: boolean) => void;
}
```

### `PlantBasicTab` (nowy)
- **Cel**: podgląd/edycja pól karty rośliny (bez harmonogramu i chorób).
- **Główne elementy**:
  - read view sekcji + przycisk „Edytuj”
  - formularz edycji z walidacją inline
  - akcje: Zapisz / Anuluj
- **Obsługiwane zdarzenia**:
  - `onStartEdit()` (z przycisku w zakładce i z nagłówka)
  - `onCancelEdit()` – wyjście z trybu edycji bez zapisu; **bez utraty danych w draftcie**
  - `onSubmit()` – PUT plant
- **Warunki walidacji (frontend, zgodne z API `PUT /api/plants/:id`)**:
  - `name`: jeśli wysyłane → `trim`, min 1, max 50
  - `soil`: max 200
  - `pot`: max 200
  - `position`: max 50
  - `difficulty`: enum `"easy" | "medium" | "hard"`
  - instrukcje i notatki: max 2000
  - `icon_key`: max 50
  - `color_hex`: regex `^#[0-9A-Fa-f]{6}$`
  - payload: `.strict()` (nie wysyłać pól spoza schematu)
- **Typy**:
  - request: `PlantCardUpdateCommand` (ale wysyłamy wyłącznie pola podstawowe)
  - response: `ApiResponseDto<PlantCardDetailDto>` (przez `apiPut`)
  - viewmodel (nowy): `PlantBasicDraftVM`, `PlantBasicErrorsVM`
- **Propsy (interfejs)**:

```ts
export interface PlantBasicTabProps {
  plantId: string;
  plantDetail: PlantCardDetailDto;
  editMode: boolean;
  onEditModeChange: (next: boolean) => void;
  onSaved: () => void; // po zapisie: refetch + exit edit
  onApiError: (error: ApiErrorViewModel) => void;
}
```

**Sposób budowy UI (reuse):**
- W trybie edycji wykorzystać istniejące sekcje z formularza tworzenia:
  - `PlantBasicsSection`
  - `PlantIdentificationSection`
  - `PlantInstructionsSection`
- Różnica: podpięcie wartości startowych z `PlantCardDetailDto` + logika „draft” i „dirty”.

**Komunikaty UX:**
- Sukces zapisu: preferować komunikat inline w zakładce (np. banner) lub, jeśli brak miejsca/komponentu banner: toast sukcesu (US-014).
- Błąd zapisu: toast błędu i zachowanie draftu (US-033).

### `PlantScheduleTab` (nowy)
- **Cel**: ustawienie częstotliwości podlewania/nawożenia dla 4 sezonów jednocześnie.
- **Główne elementy**:
  - read view (podgląd tabelaryczny) gdy nie w edycji
  - edit mode pełnego zestawu 4 sezonów:
    - desktop: siatka/tabela 4×2
    - mobile: akordeon per sezon (jeden zapis)
  - inline walidacja pól liczbowych
- **Obsługiwane zdarzenia**:
  - `onLoad()` – pobranie harmonogramu przez cache (`usePlantSchedulesCache.getOrLoad`)
  - `onStartEdit()` / `onCancel()` / `onSubmit()`
  - `onChangeSeasonValue(season, patch)`
- **Warunki walidacji (frontend, zgodne z API `PUT /api/plants/:id/schedules`)**:
  - zawsze pracować na komplecie 4 sezonów: `spring/summer/autumn/winter` (wymóg UX; dodatkowo chroni przed `schedule_incomplete`)
  - `watering_interval`: int \(0..365\)
  - `fertilizing_interval`: int \(0..365\), `0` oznacza wyłączenie nawożenia w sezonie
  - blokować znaki inne niż cyfry (US-010):
    - `inputMode="numeric"`, `pattern="[0-9]*"`
    - sanitizacja onChange (reuse z `SeasonScheduleRow`)
    - próba wklejenia niepoprawnej wartości: finalnie ma nie zmieniać stanu na nie-numeryczny
  - przy zapisie: jeśli wartości poza zakresem → inline błędy + toast (US-010)
- **Typy**:
  - request: `UpdateSchedulesCommand` (`{ schedules: SeasonalScheduleCommand[] }`)
  - response: `ApiResponseDto<SeasonalScheduleDto[]>`
  - viewmodel (nowy): `PlantScheduleEditorVM`, `ScheduleErrorsVM`
- **Propsy**:

```ts
export interface PlantScheduleTabProps {
  plantId: string;
  scheduleState: PlantScheduleStateVM;
  loadSchedule: () => Promise<PlantScheduleStateVM>;
  setScheduleState: (next: PlantScheduleStateVM) => void;
  onSaved: () => void; // refetch plant detail (header next dates/status)
  onApiError: (error: ApiErrorViewModel) => void;
}
```

**Zachowanie po zapisie:**
- Po udanym `PUT /schedules`:
  - zaktualizować cache (`setScheduleState({status:"ready", schedules: response, lastCheckedAt: now})`)
  - wywołać `onSaved()` (czyli `refetch()`), bo backend może przeliczyć `next_*_at` i `status_priority`
  - pokazać inline sukces / toast (wg miejsca)
- Jeśli serwer zwróci `schedule_incomplete` (500 z GET) lub `schedule_missing` / `duplicate_season` / 400:
  - przełożyć na stan UI (banner ostrzegawczy + możliwość przejścia w edycję i uzupełnienia 4 sezonów)

### `PlantDiseasesTab` (nowy)
- **Cel**: zarządzanie listą chorób (CRUD per wpis) w formie akordeonu.
- **Główne elementy**:
  - akordeon wpisów
  - panel „Dodaj chorobę” (inline)
  - edycja inline w panelu wpisu
  - usuwanie z „inline confirm” (drugi klik w 5s), bez undo
- **Obsługiwane zdarzenia**:
  - `onAdd()` → `POST /api/plants/:id/diseases`
  - `onEdit(diseaseId)` → przełączenie itemu w tryb edycji (lokalny stan)
  - `onSave(diseaseId)` → `PUT /api/plants/:id/diseases/:diseaseId`
  - `onDelete(diseaseId)` → 2-step confirm, finalnie `DELETE /.../:diseaseId`
  - `onAccordionToggle(itemId)` – zachować stan rozwinięcia bez resetu scrolla
- **Warunki walidacji (frontend, zgodne z API)**:
  - `name`: `trim`, min 1, max 50
  - `symptoms`: max 2000 (puste stringi mapować do `null` aby zachować spójność)
  - `advice`: max 2000 (puste stringi mapować do `null`)
  - Mutacje nie powinny resetować scrolla:
    - używać stabilnych `key={disease.id}`
    - nie remountować całego akordeonu przy pojedynczej zmianie
- **Typy**:
  - request POST: `DiseaseCommand`
  - response POST: `ApiResponseDto<DiseaseDto>`
  - request PUT: `DiseaseUpdateCommand`
  - response PUT: `ApiResponseDto<DiseaseDto>`
  - response GET: `ApiResponseDto<DiseaseDto[]>`
  - viewmodel (nowy): `DiseaseItemVM`, `DiseaseDraftVM`, `DiseaseErrorsVM`, `InlineConfirmStateVM`
- **Propsy**:

```ts
export interface PlantDiseasesTabProps {
  plantId: string;
  initialDiseases: DiseaseDto[]; // z PlantCardDetailDto.diseases
  onApiError: (error: ApiErrorViewModel) => void;
}
```

**Strategia danych (ważne):**
- `GET /api/plants/:id` zwraca `diseases`, ale CRUD chorób ma osobne endpointy.
- Zalecenie:
  - stan zakładki trzymać lokalnie (lista `DiseaseItemVM`),
  - po mutacji aktualizować listę bez refetch całego `PlantView` (dla UX),
  - opcjonalnie po mutacji wykonać `onPlantUpdated()` (refetch) jeśli chcemy pełnej spójności cross-tab.

### `PlantHistoryTab` (nowy)
- **Cel**: przegląd logu działań pielęgnacyjnych (domyślnie limit 50) + filtr typu.
- **Główne elementy**:
  - filtr typu akcji: `all | watering | fertilizing` (chips/select)
  - lista wpisów historii (czytelna typografia, daty `DD.MM.RRRR`)
  - empty state dla braku danych z sugestią użycia quick actions
- **Obsługiwane zdarzenia**:
  - `onFilterChange(actionType)` → refetch listy lub client-side filter (fallback)
  - `onRetry()` przy błędzie
- **Warunki walidacji / kontrakt API**:
  - query:
    - `action_type?: "watering" | "fertilizing"`
    - `limit?: number` (domyślnie 50, zakres 1..200)
- **Typy**:
  - response: `ApiResponseDto<CareActionsListResultDto>` gdzie `CareActionsListResultDto = CareLogDto[]`
  - viewmodel (nowy): `CareActionRowVM`, `CareActionsFilterVM`
- **Propsy**:

```ts
export interface PlantHistoryTabProps {
  plantId: string;
  recentFromDetail: CareLogDto[]; // PlantCardDetailDto.recent_care_logs (limit 5)
  onApiError: (error: ApiErrorViewModel) => void;
}
```

**Fallback wg wymagań UX:**
- Jeśli filtr server-side jest dostępny → użyć `GET /care-actions?action_type=...&limit=50`.
- Jeśli nie (lub tymczasowo) → pobrać limit 50 bez filtra i filtrować client-side.
  - W tym repo filtr server-side jest dostępny (query `action_type`), więc domyślnie stosować server-side.

## 5. Typy

### Istniejące DTO (wykorzystywane bez zmian)
- `PlantCardDetailDto`
- `PlantCardUpdateCommand`
- `SeasonalScheduleDto`
- `SeasonalScheduleCommand`
- `UpdateSchedulesCommand`
- `DiseaseDto`
- `DiseaseCommand`
- `DiseaseUpdateCommand`
- `CareLogDto`
- `CareActionsListResultDto`
- `CareActionsQueryDto`
- `PlantTabKey`
- `ApiResponseDto<T>`
- `ApiErrorDto`

### Nowe typy ViewModel (do dodania na froncie)
Zalecane umiejscowienie:
- `src/lib/plants/plant-tabs-viewmodel.ts` (wspólne VM dla zakładek)
- lub per domena: `src/lib/plants/plant-basic-viewmodel.ts`, `plant-schedule-viewmodel.ts`, `plant-diseases-viewmodel.ts`, `plant-history-viewmodel.ts`

#### `PlantBasicDraftVM`
Reprezentuje draft edycji zakładki podstawowej (wartości formularza).
- `name: string`
- `soil: string | null`
- `pot: string | null`
- `position: string | null`
- `difficulty: DifficultyLevel | null`
- `watering_instructions: string | null`
- `repotting_instructions: string | null`
- `propagation_instructions: string | null`
- `notes: string | null`
- `icon_key: string | null`
- `color_hex: string | null`

Źródło inicjalne: `PlantCardDetailDto` (normalizacja `undefined -> null`, trim tylko w walidacji).

#### `PlantBasicErrorsVM`
Inline błędy walidacji (mapowane z `ApiErrorDto.details` lub z walidacji klienta).
- `form?: string`
- `fields?: Partial<Record<keyof PlantBasicDraftVM, string>>`

#### `PlantScheduleEditorVM`
Stan edycji harmonogramu (zawsze 4 sezony).
- `values: Record<Season, SeasonalScheduleCommand>`
- `dirty: boolean`

#### `ScheduleErrorsVM`
- `form?: string`
- `seasons?: Record<Season, { watering_interval?: string; fertilizing_interval?: string }>`

#### `DiseaseDraftVM`
Draft dla tworzenia/edycji choroby.
- `name: string`
- `symptoms: string | null`
- `advice: string | null`

#### `DiseaseErrorsVM`
- `fields?: { name?: string; symptoms?: string; advice?: string }`
- `form?: string`

#### `InlineConfirmStateVM`
Do implementacji „drugi klik w 5s”.
- `armedAt: number | null`
- `expiresAt: number | null`

#### `DiseaseItemVM`
Jeden element choroby z lokalnym stanem UI.
- `id: string`
- `data: DiseaseDto` (ostatnio zapisane dane)
- `isOpen: boolean` (dla akordeonu)
- `mode: "read" | "edit"` (dla panelu)
- `draft: DiseaseDraftVM` (tylko gdy `mode==="edit"` lub w trakcie)
- `errors: DiseaseErrorsVM | null`
- `isSaving: boolean`
- `deleteConfirm: InlineConfirmStateVM`

#### `CareActionsFilterVM`
- `actionType: "all" | "watering" | "fertilizing"`
- `limit: number` (domyślnie 50)

#### `CareActionRowVM`
Format pod UI listy historii.
- `id: string`
- `actionTypeLabel: "Podlewanie" | "Nawożenie"`
- `performedAtDisplay: string` (format `DD.MM.RRRR`)

## 6. Zarządzanie stanem

### Stan globalny widoku (w `PlantView`)
- **Źródło danych rośliny**: `usePlantDetailData(plantId)`
  - dostarcza: `data`, `error`, `isLoading`, `authRequired`, `notFound`, `refetch`
- **Zakładka**: `usePlantTabState(initialTab)`
  - trzyma `tab` w URL i wspiera back/forward
- **Cache harmonogramu**: `usePlantSchedulesCache()`
  - `getState(plantId)` (render)
  - `getOrLoad(plantId)` (ładowanie do quick actions i zakładki schedule)
  - `setState(plantId, next)` (po zapisie harmonogramu / mapowaniu błędów)
- **Tryb edycji podstawowych**:
  - `basicEditMode` w `PlantView` (sterowane także z `PlantHeader`)

### Hooki rekomendowane (nowe)
- `usePlantBasicDraft(plantDetail)`
  - inicjalizacja draftu z `PlantCardDetailDto`
  - `setPatch(patch)` + `dirty`
  - `resetToServer()` (opcjonalnie po udanym refetch)
- `usePlantScheduleEditor(scheduleState, loadSchedule)`
  - zapewnia zawsze komplet 4 sezonów w `values`
  - mapuje `PlantScheduleStateVM` → `Record<Season, SeasonalScheduleCommand>`
  - waliduje zakresy i zwraca `ScheduleErrorsVM`
- `useDiseasesCrud(plantId, initialDiseases)`
  - trzyma listę `DiseaseItemVM`
  - metody: `add`, `startEdit(id)`, `cancelEdit(id)`, `save(id)`, `requestDelete(id)`, `confirmDelete(id)`
  - izoluje logikę 2-click confirm + timeout
- `useCareActionsList(plantId, { actionType, limit })`
  - pobiera dane z `GET /api/plants/:id/care-actions`
  - cache per `plantId + actionType + limit` (opcjonalnie)
  - mapuje `CareLogDto` → `CareActionRowVM` (format dat)

## 7. Integracja API

### Wymagane rozszerzenie klienta API
Obecny `src/lib/api/api-client.ts` obsługuje `GET`, `POST`, `DELETE`. Dla zakładek potrzebny jest `PUT`.
- Dodać `apiPut<T>(path: string, body?: unknown): Promise<ApiResult<T>>`
- (opcjonalnie) dodać `apiPatch` jeśli kiedyś użyjemy PATCH, ale na teraz wystarczy PUT.

### Mapowanie zakładek na endpointy

#### Zakładka Podstawowe
- **Pobranie danych**: `GET /api/plants/:id`
  - response: `ApiResponseDto<PlantCardDetailDto>`
- **Zapis edycji**: `PUT /api/plants/:id`
  - request: `PlantCardUpdateCommand` (wysyłać tylko pola podstawowe; NIE wysyłać `schedules` ani `diseases`)
  - response: `ApiResponseDto<PlantCardDetailDto>`

#### Zakładka Harmonogram
- **Pobranie**: `GET /api/plants/:id/schedules`
  - response: `ApiResponseDto<SeasonalScheduleDto[]>`
  - uwaga: jeśli brak 4 sezonów → 500 `schedule_incomplete` (traktować jako stan wymagający uzupełnienia)
- **Zapis**: `PUT /api/plants/:id/schedules`
  - request: `UpdateSchedulesCommand` (zalecenie UX: zawsze wysłać komplet 4 sezonów)
  - response: `ApiResponseDto<SeasonalScheduleDto[]>`

#### Zakładka Choroby
- **Lista**: `GET /api/plants/:id/diseases`
  - response: `ApiResponseDto<DiseaseDto[]>`
- **Dodanie**: `POST /api/plants/:id/diseases`
  - request: `DiseaseCommand`
  - response: `ApiResponseDto<DiseaseDto>`
- **Edycja**: `PUT /api/plants/:id/diseases/:diseaseId`
  - request: `DiseaseUpdateCommand` (min. 1 pole wymagane przez backend)
  - response: `ApiResponseDto<DiseaseDto>`
- **Usunięcie**: `DELETE /api/plants/:id/diseases/:diseaseId`
  - response: `ApiResponseDto<null>` + `message`

#### Zakładka Historia
- **Lista**: `GET /api/plants/:id/care-actions`
  - query: `CareActionsQueryDto` (`action_type?`, `limit?`)
  - response: `ApiResponseDto<CareActionsListResultDto>` (czyli `CareLogDto[]`)

### Konwencja obsługi 401/404 (US-036)
- 401: redirect do `/auth/login?redirectTo=...` (spójnie z `PlantView.handleApiError`)
- 404 / brak dostępu: pokazać „Nie znaleziono rośliny / brak dostępu” (404-like); nie ujawniać różnicy między brak/not owned.

## 8. Interakcje użytkownika

### Podstawowe
- **Wejście na zakładkę**: widok read-only sekcji (neutralna prezentacja pustych pól).
- **Klik „Edytuj” (w zakładce lub w nagłówku)**:
  - przełączenie na tryb edycji,
  - fokus na pierwszym polu (np. `name`).
- **Edycja pól**:
  - walidacja inline,
  - liczniki znaków dla textarea (max 2000).
- **Anuluj**:
  - wyjście z trybu edycji,
  - zachowanie draftu (użytkownik może wrócić do edycji bez utraty wpisanych wartości).
- **Zapisz**:
  - wysłanie PUT,
  - sukces: inline komunikat / toast + wyjście z edycji + refetch,
  - błąd: toast + pozostanie w edycji + brak utraty draftu (US-033).

### Harmonogram
- **Wejście**:
  - jeśli cache `unknown` → `getOrLoad`,
  - jeśli `missing/incomplete` → banner z CTA „Uzupełnij harmonogram”.
- **Tryb edycji**:
  - edycja czterech sezonów,
  - pola liczbowe: blokada znaków nienumerycznych (US-010).
- **Zapis**:
  - walidacja zakresów; błędy: inline + toast (US-010),
  - sukces: aktualizacja cache + refetch plant detail (dla header) + komunikat sukcesu.

### Choroby
- **Lista chorób**:
  - render akordeonu z wpisami,
  - brak wpisów: empty state + CTA „Dodaj chorobę”.
- **Dodaj**:
  - panel inline z walidacją,
  - po sukcesie: dodanie elementu do listy i (opcjonalnie) rozwinięcie nowego wpisu.
- **Edycja**:
  - przełączenie itemu w tryb edycji (bez resetu scrolla),
  - zapis inline, błędy inline (400) + toast dla błędów ogólnych.
- **Usunięcie**:
  - 1. klik: uzbrojenie potwierdzenia (np. zmiana label na „Potwierdź” + timer 5s),
  - 2. klik w 5s: DELETE,
  - po sukcesie: usunięcie itemu z listy (bez undo).

### Historia
- **Wyświetlenie listy**:
  - domyślnie limit 50,
  - daty `DD.MM.RRRR`.
- **Filtr typu**:
  - zmiana filtra → refetch server-side z `action_type` (fallback: filtrowanie client-side).
- **Brak danych**:
  - empty state z podpowiedzią użycia quick actions.

## 9. Warunki i walidacja

### Walidacja pól tekstowych (Podstawowe + Choroby)
- Limity:
  - `name`: max 50 (wymagane: roślina i choroba)
  - `soil`, `pot`: max 200
  - `position`: max 50
  - instrukcje/notatki: max 2000
  - `symptoms`, `advice`: max 2000
- `trim` przed wysyłką (lub na etapie walidacji klienta).
- Puste wartości opcjonalne: normalizować do `null` (szczególnie dla chorób).

### Walidacja pól liczbowych (Harmonogram) – US-010
- Na poziomie input:
  - blokować znaki inne niż cyfry (sanitizacja onChange).
  - odrzucić wklejenie nieprawidłowej wartości (sanitizacja).
- Na poziomie formularza:
  - wartości muszą być int,
  - zakres: \(0 \le x \le 365\),
  - błąd walidacji:
    - inline per pole,
    - toast o błędzie (zgodnie z US-010).

### Warunki API wpływające na UI
- `401 unauthorized`: redirect do loginu.
- `404 plant_not_found / not_found`: „Nie znaleziono rośliny / brak dostępu” (nie zdradzać powodu).
- `schedule_incomplete` (GET schedules): stan wymagający uzupełnienia harmonogramu (banner + CTA).
- `fertilizing_disabled`: w harmonogramie dopuszczalne (wartość 0), w quick actions blokuje nawożenie; UI powinno jasno informować.
- `performed_at_in_future`: dotyczy modala backdate (już obsłużone inline w `BackdateCareActionModal`).

## 10. Obsługa błędów

### Kategoryzacja
- **Walidacja 400 (Zod / domain)**:
  - mapować `ApiErrorDto.details` na inline errors (pola/form),
  - toast tylko gdy błąd ogólny lub brak miejsca inline.
- **401**:
  - centralnie w `PlantView.handleApiError`: redirect do logowania.
- **404/403 maskowane jako 404**:
  - wyświetlić empty state „Nie znaleziono rośliny…”.
- **409 (np. `duplicate_season`)**:
  - inline error formularza harmonogramu + toast (jeśli potrzebny).
- **5xx**:
  - toast „Coś poszło nie tak” + możliwość ponowienia (retry button w zakładce lub globalny ekran 5xx w `PlantView`).

### Brak utraty danych (US-033)
- W zakładkach edycyjnych (Podstawowe/Harmonogram/Choroby) nie resetować draftów po błędzie API.
- Po błędzie mutacji pozostawić użytkownika w kontekście:
  - nie przewijać do góry,
  - nie zamykać akordeonu,
  - nie przełączać zakładek.

## 11. Kroki implementacji

1. **Dodać `apiPut` do `src/lib/api/api-client.ts`**
   - zachować tę samą strukturę `ApiResult<T>` i obsługę `ApiResponseDto<T>`.

2. **Dodać `PlantTabPanel` i wpiąć go do `PlantView`**
   - zastąpić placeholder „Zakładka jest w przygotowaniu” realnym switchem po `tab`.
   - dodać `basicEditMode` w `PlantView` i podłączyć `PlantHeader.onEdit`.

3. **Zaimplementować `PlantBasicTab`**
   - stworzyć mapper `PlantCardDetailDto -> PlantBasicDraftVM`.
   - reuse komponentów sekcji z `NewPlantView` (Basics/Identification/Instructions) z nowym typem values/errors (lub adapter do `NewPlantFormValues` / `NewPlantFormErrors`).
   - dodać walidację klienta + mapowanie błędów z API `details`.
   - `PUT /api/plants/:id` i po sukcesie: exit edit + refetch.

4. **Zaimplementować `PlantScheduleTab`**
   - na wejściu: `loadSchedule()` jeśli potrzebne.
   - zbudować editor z kompletem 4 sezonów (jeśli braki – wypełnić brakujące sezony wartościami domyślnymi 0, aby użytkownik mógł uzupełnić).
   - UI:
     - desktop: układ tabelaryczny/siatka,
     - mobile: akordeon (jeśli brak komponentu akordeonu w UI → dodać `src/components/ui/accordion.tsx` lub użyć semantycznego `<details>`).
   - walidacja liczbowa (US-010) + `PUT /api/plants/:id/schedules`.
   - po sukcesie: aktualizacja cache + refetch plant detail.

5. **Zaimplementować `PlantDiseasesTab`**
   - inicjalizować listę z `plantDetail.diseases` oraz/lub wykonać `GET /api/plants/:id/diseases` (jeśli chcemy pewności świeżości).
   - dodać panel tworzenia (POST) + akordeon z edycją (PUT) i usuwaniem (DELETE).
   - zaimplementować 2-click confirm (5s) bez undo.
   - zadbać o brak resetu scrolla: stabilne key, lokalne aktualizacje listy.

6. **Zaimplementować `PlantHistoryTab`**
   - użyć `GET /api/plants/:id/care-actions?limit=50` i opcjonalnie `action_type`.
   - dodać filtr (chips/select) i empty state.
   - format dat: użyć `formatDisplayDate` z `src/lib/date/format.ts`.

7. **Mapowanie user stories na test plan (manual)**
   - US-023: wejście na `/app/plants/:id` pokazuje wszystkie pola + harmonogram i ostatnie działania (nagłówek + historia).
   - US-014/US-015: edycja i anulowanie w Podstawowe (bez zapisu, bez utraty draftu).
   - US-024/US-025 + US-010: edycja harmonogramu per sezon z walidacją tylko cyfry i zakresem.
   - US-012/US-013: CRUD chorób w akordeonie + usuwanie z potwierdzeniem.
   - US-033: wymuszenie błędu (np. walidacja) i sprawdzenie, że dane w formularzu zostają.
   - US-036: próba wejścia w nie-swoją roślinę → 404-like (bez ujawnienia).

8. **Dopracować UX/A11y**
   - role tablist/tab (już w `PlantTabs`)
   - aria-invalid/aria-describedby dla pól z błędami (w sekcjach już w większości jest)
   - focus management przy wejściu w edit (name) i po błędach (pierwsze pole z błędem – opcjonalnie)

