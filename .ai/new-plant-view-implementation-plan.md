# Plan implementacji widoku Dodaj roślinę

## 1. Przegląd
Widok umożliwia utworzenie nowej karty rośliny z minimalnym wymaganym zestawem danych (obowiązkowo `name`) oraz opcjonalnymi polami tekstowymi, identyfikacją (ikona/kolor), harmonogramami sezonowymi i chorobami. Po poprawnym zapisie użytkownik jest przekierowany do szczegółów rośliny, a przy błędach walidacji dane formularza nie są tracone.

## 2. Routing widoku
`/app/plants/new`

## 3. Struktura komponentów
- `NewPlantPage` (Astro)
  - `Layout`
    - `NewPlantView` (React, client:load)
      - `NewPlantHeader`
      - `NewPlantForm`
        - `PlantBasicsSection`
        - `PlantInstructionsSection`
        - `PlantIdentificationSection`
        - `PlantSchedulesSection` (opcjonalna)
          - `SeasonScheduleRow` x4
        - `PlantDiseasesSection` (opcjonalna)
          - `DiseaseEntryRow` (lista dynamiczna)
        - `FormActions`

## 4. Szczegóły komponentów
### `NewPlantPage` (Astro)
- Opis komponentu: strona routingu osadzająca widok w `Layout`.
- Główne elementy: `Layout`, `NewPlantView` z `client:load`, `initialUrl`.
- Obsługiwane interakcje: brak (statyczny wrapper).
- Obsługiwana walidacja: brak.
- Typy: brak.
- Propsy: brak.

### `NewPlantView`
- Opis komponentu: kontener logiki widoku; trzyma stan formularza, obsługuje zapis, toasty i przekierowania.
- Główne elementy: `main`, nagłówek, `NewPlantForm`.
- Obsługiwane interakcje:
  - submit formularza,
  - przekierowanie po sukcesie do `/app/plants/:id?tab=basic`,
  - przekierowanie na login przy `401`.
- Obsługiwana walidacja:
  - wstępna walidacja po stronie klienta (limity długości, format `color_hex`, tylko cyfry w liczbach),
  - mapowanie błędów `400` z API do pól formularza.
- Typy:
  - `NewPlantFormValues`, `NewPlantFormErrors`, `CreatePlantResult`.
- Propsy:
  - `initialUrl: string` (do redirectu na login).

### `NewPlantForm`
- Opis komponentu: formularz z sekcjami; przyjmuje wartości i callbacki; emituje submit.
- Główne elementy: `<form>`, sekcje pól, `Button` submit/secondary.
- Obsługiwane interakcje:
  - `onSubmit`,
  - zmiana wartości pól,
  - dodawanie/usuwanie chorób,
  - włączanie/wyłączanie sekcji harmonogramu i chorób.
- Obsługiwana walidacja:
  - wymagane `name`,
  - limity długości pól tekstowych,
  - `color_hex` zgodny z `^#[0-9A-Fa-f]{6}$`,
  - pola liczbowe tylko cyfry i zakres 0–365.
- Typy:
  - `NewPlantFormValues`, `NewPlantFormErrors`, `SeasonalScheduleCommand`, `DiseaseCommand`.
- Propsy:
  - `values: NewPlantFormValues`,
  - `errors: NewPlantFormErrors`,
  - `isSubmitting: boolean`,
  - `onChange: (patch: Partial<NewPlantFormValues>) => void`,
  - `onAddDisease`, `onRemoveDisease`, `onUpdateDisease`,
  - `onUpdateSchedule`,
  - `onSubmit`.

### `PlantBasicsSection`
- Opis komponentu: sekcja podstawowych danych rośliny.
- Główne elementy: `Input`, `Select`, etykiety, opisy pomocnicze.
- Obsługiwane interakcje: wpisywanie tekstu, wybór trudności, wybór stanowiska (lista).
- Obsługiwana walidacja:
  - `name` wymagane, max 50,
  - `soil`/`pot` max 200,
  - `position` max 50,
  - `difficulty` tylko `easy|medium|hard`.
- Typy: `DifficultyLevel`.
- Propsy: `values`, `errors`, `onChange`.

### `PlantInstructionsSection`
- Opis komponentu: pola instrukcji i notatek.
- Główne elementy: `Textarea` (lub `Input` wielolinijkowy), liczniki znaków.
- Obsługiwane interakcje: wpisywanie tekstu, blur.
- Obsługiwana walidacja: każdy z pól max 2000 znaków.
- Typy: brak dodatkowych.
- Propsy: `values`, `errors`, `onChange`.

### `PlantIdentificationSection`
- Opis komponentu: wybór ikony i koloru rośliny.
- Główne elementy: picker ikon, `Input` dla koloru, podgląd.
- Obsługiwane interakcje: wybór ikony, wpisanie/wybór koloru.
- Obsługiwana walidacja:
  - `icon_key` max 50,
  - `color_hex` format hex (`#RRGGBB`).
- Typy: `PlantIconOption` (nowy typ VM).
- Propsy: `values`, `errors`, `onChange`.

### `PlantSchedulesSection` (opcjonalna)
- Opis komponentu: opcjonalne uzupełnienie harmonogramu sezonowego.
- Główne elementy: przełącznik “Ustaw harmonogram”, lista `SeasonScheduleRow`.
- Obsługiwane interakcje:
  - aktywacja/dezaktywacja sekcji,
  - wpisywanie wartości liczbowych.
- Obsługiwana walidacja:
  - `watering_interval`, `fertilizing_interval` jako liczby całkowite 0–365,
  - blokada znaków nienumerycznych (US-010),
  - unikalność sezonów w payloadzie.
- Typy: `SeasonalScheduleCommand`.
- Propsy: `values.schedules`, `errors.schedules`, `onUpdateSchedule`, `onToggleSchedules`.

### `SeasonScheduleRow`
- Opis komponentu: pojedynczy wiersz dla sezonu.
- Główne elementy: label sezonu, inputy `watering_interval`, `fertilizing_interval`, opis “0 wyłącza nawożenie”.
- Obsługiwane interakcje: wpisywanie liczb, wklejanie (blokada niecyfrowych).
- Obsługiwana walidacja: zakres 0–365.
- Typy: `Season`.
- Propsy: `season`, `value`, `error`, `onChange`.

### `PlantDiseasesSection` (opcjonalna)
- Opis komponentu: lista chorób (akordeon/stack).
- Główne elementy: lista `DiseaseEntryRow`, przycisk “Dodaj chorobę”.
- Obsługiwane interakcje: dodawanie/usuwanie, edycja pól.
- Obsługiwana walidacja:
  - `name` wymagane, max 50,
  - `symptoms`, `advice` max 2000.
- Typy: `DiseaseCommand`.
- Propsy: `values.diseases`, `errors.diseases`, `onAddDisease`, `onRemoveDisease`, `onUpdateDisease`.

### `DiseaseEntryRow`
- Opis komponentu: formularz jednej choroby.
- Główne elementy: `Input` nazwy, `Textarea` objawów i porad.
- Obsługiwane interakcje: wpisywanie, usuwanie pozycji.
- Obsługiwana walidacja: jak w sekcji chorób.
- Typy: `DiseaseCommand`.
- Propsy: `value`, `error`, `onChange`, `onRemove`.

### `FormActions`
- Opis komponentu: przyciski akcji i stan ładowania.
- Główne elementy: `Button` primary (Zapisz), secondary (Anuluj).
- Obsługiwane interakcje:
  - submit,
  - anulowanie → powrót do `/app/plants`.
- Obsługiwana walidacja: brak.
- Typy: brak.
- Propsy: `isSubmitting`, `onCancel`.

## 5. Typy
### Istniejące DTO/Command
- `PlantCardCreateCommand` (payload `POST /api/plants`)
- `PlantCardDetailDto` (odpowiedź sukcesu)
- `SeasonalScheduleCommand`
- `DiseaseCommand`
- `ApiResponseDto<T>`
- `ApiErrorDto`

### Nowe typy ViewModel (frontend)
- `NewPlantFormValues`
  - `name: string`
  - `soil?: string`
  - `pot?: string`
  - `position?: string`
  - `difficulty?: DifficultyLevel`
  - `watering_instructions?: string`
  - `repotting_instructions?: string`
  - `propagation_instructions?: string`
  - `notes?: string`
  - `icon_key?: string`
  - `color_hex?: string`
  - `schedules?: Array<SeasonalScheduleCommand>`
  - `diseases?: Array<DiseaseCommand>`
- `NewPlantFormErrors`
  - `form?: string`
  - `fields?: Record<string, string>`
  - `schedules?: Record<Season, { watering_interval?: string; fertilizing_interval?: string }>`
  - `diseases?: Array<{ name?: string; symptoms?: string; advice?: string }>`
- `CreatePlantResult`
  - `data: PlantCardDetailDto | null`
  - `error: ApiErrorViewModel | null`
- `PlantIconOption`
  - `key: string`
  - `label: string`
  - `previewClass?: string`

## 6. Zarządzanie stanem
- Lokalny stan w `NewPlantView`:
  - `values: NewPlantFormValues`
  - `errors: NewPlantFormErrors`
  - `isSubmitting: boolean`
  - `authRequired: boolean` (po `401`)
- Zalecany custom hook: `useCreatePlant`
  - odpowiedzialność: walidacja klienta, mapowanie błędów `400`, wywołanie `apiPost`, zwrot stanu `isSubmitting`.
  - wzorzec spójny z `usePlantsData` i `useDashboardData`.

## 7. Integracja API
- Endpoint: `POST /api/plants`
- Typ żądania: `PlantCardCreateCommand`
  - `name` wymagane
  - opcjonalne pola tekstowe i identyfikacja
  - `schedules` i `diseases` opcjonalne
- Typ odpowiedzi: `ApiResponseDto<PlantCardDetailDto>`
- Obsługa statusów:
  - `201`: sukces → toast sukcesu, redirect do `/app/plants/:id?tab=basic`
  - `400`: walidacja → inline errors, brak resetu formularza
  - `401`: redirect do `/auth/login?redirectTo=...`
  - `403`: toast „Brak dostępu”
  - `409`: inline błąd sekcji harmonogramu (duplikat sezonu)
  - `500`: toast błędu

## 8. Interakcje użytkownika
- Wpisywanie danych w sekcjach formularza → aktualizacja stanu lokalnego.
- Klik “Dodaj chorobę” → dodanie nowego wpisu z pustymi polami.
- Usuwanie choroby → usunięcie wpisu z listy.
- Włączenie sekcji harmonogramu → domyślne wartości lub puste inputy dla 4 sezonów.
- Klik “Zapisz” → walidacja klienta + wysłanie `POST /api/plants`.
- Klik “Anuluj” → powrót do `/app/plants` bez zapisu.

## 9. Warunki i walidacja
- `name`: wymagane, max 50 znaków.
- `soil`, `pot`: max 200 znaków.
- `position`: max 50 znaków.
- `watering_instructions`, `repotting_instructions`, `propagation_instructions`, `notes`: max 2000 znaków.
- `icon_key`: max 50 znaków.
- `color_hex`: regex `^#[0-9A-Fa-f]{6}$`.
- `schedules`:
  - `watering_interval` i `fertilizing_interval` tylko cyfry, integer 0–365,
  - brak duplikatów sezonu,
  - `0` dla `fertilizing_interval` oznacza wyłączenie nawożenia.
- `diseases`:
  - `name` wymagane, max 50,
  - `symptoms`, `advice` max 2000.

## 10. Obsługa błędów
- `400 validation_error`: mapowanie `error.details` na pola formularza (Zod `flatten`).
- `409 duplicate_season`: błąd inline w sekcji harmonogramu + ewentualny toast.
- `401 unauthorized`: przekierowanie do logowania z `redirectTo`.
- `403 forbidden`: toast o braku dostępu, pozostawienie formularza.
- `500 server_error`: toast „Nie udało się zapisać rośliny”.
- Błędy sieci: toast i zachowanie danych w formularzu.

## 11. Kroki implementacji
1. Dodaj stronę `src/pages/app/plants/new.astro` z `Layout` i `NewPlantView client:load`.
2. Utwórz `NewPlantView` w `src/components/plants/` z lokalnym stanem formularza.
3. Zdefiniuj typy VM w `src/lib/plants/new-plant-viewmodel.ts` (lub w `src/lib/plants/` obok listy).
4. Zbuduj `NewPlantForm` i sekcje (`Basics`, `Instructions`, `Identification`, `Schedules`, `Diseases`).
5. Dodaj walidację klienta i blokadę niecyfrowych znaków dla pól liczbowych.
6. Utwórz `useCreatePlant` (lub logikę w `NewPlantView`) korzystając z `apiPost`.
7. Zmapuj błędy `400` z API na `NewPlantFormErrors` i pokaż inline.
8. Dodaj toasty sukcesu i błędów (sonner) oraz redirect po `201`.
9. Sprawdź UX: zachowanie danych po błędzie, poprawne limity znaków i formaty.
