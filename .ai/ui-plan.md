# Architektura UI dla Greenie

## 1. Przegląd struktury UI

Greenie to responsywna aplikacja webowa dostępna **wyłącznie po zalogowaniu**, wspierająca prywatne zarządzanie roślinami: CRUD kart roślin, harmonogram sezonowy (podlewanie/nawożenie), log działań (z backdating), dashboard z priorytetyzacją oraz listę roślin z wyszukiwaniem i paginacją.

### 1.1. Podział na strefy (public/private)

- **Publiczne (bez sesji)**:
  - `/` (landing)
  - `/auth/login`, `/auth/register`, `/auth/reset`
- **Prywatne (wymagają sesji)**:
  - `/app/dashboard`
  - `/app/plants`
  - `/app/plants/new`
  - `/app/plants/:id?tab=basic|schedule|diseases|history`

### 1.2. Mapowanie UI ↔ API (zasada projektowa)

- **Widoki listowe** są server-driven i odzwierciedlają stan w URL query (`page`, `limit`, `search`, `sort`, `direction`) dla linkowalności i odtwarzalności.
- **Szczegóły rośliny** są podzielone na zakładki mapujące się na zasoby API:
  - `basic` ↔ `GET/PUT /api/plants/:id`
  - `schedule` ↔ `GET/PUT /api/plants/:id/schedules`
  - `diseases` ↔ `GET/POST/PUT/DELETE /api/plants/:id/diseases...`
  - `history` ↔ `GET /api/plants/:id/care-actions`
- **Quick actions** (podlej/nawóź) ↔ `POST /api/plants/:id/care-actions` (domyślnie „dziś”, opcjonalnie backdating).
- **Dashboard** ↔ `GET /api/dashboard` (sekcja „wymagają uwagi” + paginowana lista "wszystkich" + statystyki).

### 1.3. Wzorce UX, dostępność, bezpieczeństwo

- **Wzorzec edycji**: „read view + Edytuj” w każdej zakładce (domyślnie podgląd; edycja dopiero po kliknięciu).
- **Stany**:
  - first-load → skeletony,
  - brak danych → EmptyState + CTA,
  - błędy walidacji (`400`) → inline przy polach/sekcji,
  - błędy globalne (`401/403/500`) → PageError lub toast (zależnie od kontekstu) + właściwy redirect.
- **Komunikaty**:
  - sukcesy krótkie (3s) → toast, gdy brak naturalnego miejsca inline,
  - walidacja / błędy pól → inline (nie toast jako domyślne).
- **Dostępność**:
  - status nie tylko kolorem: kolor jako dominujący sygnał + subtelne badge + tekst terminów + treść wspierająca czytniki (np. `sr-only` dla krytycznych informacji),
  - modale z focus trap i obsługą ESC,
  - akordeony i zakładki z poprawnymi atrybutami ARIA oraz pełną obsługą klawiatury.
- **Bezpieczeństwo i prywatność**:
  - brak sesji → redirect do logowania z parametrem `redirectTo`,
  - brak dostępu do rośliny (`403` lub odpowiednik „not found”) → ekran 404‑like + CTA do `/app/plants` (bez ujawniania istnienia zasobu),
  - wyszukiwanie i listy zawsze ograniczone do prywatnej kolekcji użytkownika.

### 1.4. Zakres MVP vs PRD

- PRD zawiera „profil (zmiana hasła i nicku)”, ale na etapie MVP **nie implementujemy widoków profilu** (decyzja planistyczna).
- Stopka z dokumentami prawnymi obecna na landing i w `/app/*`.

### 1.5. Otwarte kwestie (do spięcia kontraktu UI z backendem)

- Dashboard: doprecyzować kontrakt i UX dla dwóch sekcji — `requires_attention` jako podzbiór oraz `all_plants` jako pełna lista (paginacja/wyszukiwanie/sortowanie dotyczą sekcji „Wszystkie”).
- Historia: parametry query filtrowania typu akcji (nazwa parametru oraz czy filtr ma być server-side vs client-side).
- Definicja „brak harmonogramu”: jak UI rozpoznaje stan nieustawiony (np. brak 4 sezonów vs wartości 0) i jak to wpływa na blokady akcji.
- Ustalenie docelowych defaultów cache/retry/refetch pod UX (zachowawcze, bez agresywnego refetch-on-focus jeśli psuje UX).

## 2. Lista widoków

Poniżej: nazwa, ścieżka, cel, informacje, komponenty, oraz uwagi UX/dostępność/bezpieczeństwo (w tym mapowanie na API).

### 2.1. Landing

- **Nazwa widoku**: Landing
- **Ścieżka widoku**: `/`
- **Główny cel**: wejście do produktu i przekierowanie do auth; podstawowe info o aplikacji.
- **Kluczowe informacje do wyświetlenia**: opis produktu, CTA „Zaloguj / Zarejestruj”.
- **Kluczowe komponenty widoku**:
  - hero + CTA,
  - stopka z dokumentami prawnymi.
- **UX, dostępność i względy bezpieczeństwa**:
  - jeśli aktywna sesja: CTA „Przejdź do aplikacji” → `/app/dashboard`,
  - linki prawne dostępne z klawiatury, semantyczne nagłówki.

### 2.2. Logowanie

- **Nazwa widoku**: Logowanie
- **Ścieżka widoku**: `/auth/login`
- **Główny cel**: zalogowanie użytkownika do strefy `/app`.
- **Kluczowe informacje do wyświetlenia**: formularz email/hasło, opcja Google, link „Nie pamiętasz hasła?”.
- **Kluczowe komponenty widoku**:
  - formularz logowania,
  - przycisk logowania Google,
  - inline errors przy polach, toast dla błędów ogólnych auth.
- **UX, dostępność i względy bezpieczeństwa**:
  - po sukcesie: redirect do `redirectTo` lub `/app/dashboard`,
  - błędy auth (np. złe dane): komunikat czytelny, bez ujawniania wrażliwych informacji.
- **Powiązane wymagania/US**: US-002, US-003, US-006.

### 2.3. Rejestracja

- **Nazwa widoku**: Rejestracja
- **Ścieżka widoku**: `/auth/register`
- **Główny cel**: utworzenie konta.
- **Kluczowe informacje do wyświetlenia**: formularz email/hasło + walidacja.
- **Kluczowe komponenty widoku**:
  - formularz rejestracji,
  - inline walidacja + toast dla błędów ogólnych.
- **UX, dostępność i względy bezpieczeństwa**:
  - po sukcesie: automatyczne zalogowanie i redirect do `/app/dashboard`,
  - jasne komunikaty wymagań hasła.
- **Powiązane wymagania/US**: US-001, US-006.

### 2.4. Reset hasła

- **Nazwa widoku**: Reset hasła
- **Ścieżka widoku**: `/auth/reset`
- **Główny cel**: odzyskanie dostępu.
- **Kluczowe informacje do wyświetlenia**: pole email, informacja o wysłaniu instrukcji.
- **Kluczowe komponenty widoku**:
  - formularz resetu,
  - potwierdzenie wysyłki (inline) + toast dla błędów ogólnych.
- **UX, dostępność i względy bezpieczeństwa**:
  - neutralna informacja o wyniku (bez ujawniania czy email istnieje, jeśli dotyczy dostawcy auth).
- **Powiązane wymagania/US**: US-004.

### 2.5. Layout aplikacji (shell)

- **Nazwa widoku**: Layout `/app/*`
- **Ścieżka widoku**: `/app/*`
- **Główny cel**: spójna rama nawigacji, toasty, obsługa redirectów oraz stanów globalnych.
- **Kluczowe informacje do wyświetlenia**: nawigacja, tytuł/crumbs, miejsce na treść.
- **Kluczowe komponenty widoku**:
  - top nav (desktop) + bottom nav (mobile),
  - kontener toastów,
  - globalny „auth gate” (ochrona tras i redirect),
  - stopka (linki prawne).
- **UX, dostępność i względy bezpieczeństwa**:
  - czytelne aktywne stany nawigacji, duże cele dotyku (mobile),
  - przy `401`: redirect do `/auth/login?redirectTo=<current>`,
  - przy `403`: w zależności od kontekstu - ekran 404‑like (dla zasobów) lub PageError (dla sekcji).

### 2.6. Dashboard

- **Nazwa widoku**: Dashboard
- **Ścieżka widoku**: `/app/dashboard`
- **Główny cel**: szybki przegląd pilności + szybkie akcje.
- **Kluczowe informacje do wyświetlenia**:
  - `requires_attention` (tylko jeśli niepuste),
  - „Wszystkie moje rośliny” (paginowane + search; pełna lista),
  - statystyki (`total_plants`, `urgent`, `warning`).
- **Kluczowe komponenty widoku**:
  - sekcja `requires_attention` (lista `PlantCard`),
  - sekcja „Wszystkie moje rośliny” (lista `PlantCard` + search + pagination),
  - `PlantCard` z: identyfikacją (ikona/kolor), statusem (kolor + badge), terminami (podlewanie/nawożenie), quick actions,
  - EmptyState (gdy brak roślin) z CTA „Dodaj roślinę”.
- **UX, dostępność i względy bezpieczeństwa**:
  - status jako kolor + tekst/badge, terminy prezentowane w formacie `DD.MM.RRRR`,
  - quick actions: klik = akcja „dziś”; alternatywa = modal backdating,
  - nawożenie disabled, gdy `fertilizing_interval=0` (lub gdy API zwróci `400` – komunikat inline w modalu),
  - jeśli brak harmonogramu: quick actions zablokowane + CTA prowadzące do `/app/plants/:id?tab=schedule` z komunikatem inline.
- **Mapowanie na API**: `GET /api/dashboard` (query: `page`, `limit`, `search`, `sort`, `direction` dla sekcji „Wszystkie”).
- **Powiązane wymagania/US**: US-007, US-018–US-022, US-026–US-031, US-035.

### 2.7. Lista roślin

- **Nazwa widoku**: Rośliny (lista)
- **Ścieżka widoku**: `/app/plants`
- **Główny cel**: pełna lista roślin z wyszukiwaniem i paginacją.
- **Kluczowe informacje do wyświetlenia**:
  - lista roślin z priorytetem i podstawowymi terminami,
  - stan listy w URL (query).
- **Kluczowe komponenty widoku**:
  - toolbar: search, sort, (opcjonalnie w przyszłości filtry),
  - lista `PlantCard` (lekka, stabilne klucze),
  - pagination.
- **UX, dostępność i względy bezpieczeństwa**:
  - brak w MVP dodatkowego filtra „tylko wymagające uwagi” (przyszłe rozszerzenie),
  - na mobile: menu kontekstowe na karcie (ikona) z akcjami (np. przejdź do szczegółów, usuń).
- **Mapowanie na API**: `GET /api/plants` (query: `page`, `limit`, `search`, `sort`, `direction`, opcjonalnie `needs_attention` – w MVP nieeksponowane w UI).
- **Powiązane wymagania/US**: US-018–US-022, US-032, US-035, US-036.

### 2.8. Nowa roślina

- **Nazwa widoku**: Dodaj roślinę
- **Ścieżka widoku**: `/app/plants/new`
- **Główny cel**: utworzenie karty rośliny z minimalnym wymaganym zestawem (i opcjonalnymi danymi).
- **Kluczowe informacje do wyświetlenia**:
  - minimalnie: `name`,
  - opcjonalnie: reszta pól karty, ikona/kolor (z wartościami domyślnymi), (opcjonalnie) początkowe schedules/diseases.
- **Kluczowe komponenty widoku**:
  - formularz karty rośliny (sekcje: podstawowe, instrukcje, identyfikacja),
  - walidacja inline (limity długości, format `color_hex`, pola liczbowe jeśli obecne).
- **UX, dostępność i względy bezpieczeństwa**:
  - po `POST`: redirect do `/app/plants/:id?tab=basic` + toast sukcesu + „nudge” do uzupełnienia harmonogramu i chorób,
  - przy `400`: inline błędy, dane nie tracone.
- **Mapowanie na API**: `POST /api/plants`.
- **Powiązane wymagania/US**: US-008–US-011, US-033.

### 2.9. Szczegóły rośliny (kontener)

- **Nazwa widoku**: Szczegóły rośliny
- **Ścieżka widoku**: `/app/plants/:id?tab=basic|schedule|diseases|history`
- **Główny cel**: pełny podgląd i zarządzanie rośliną w zakładkach.
- **Kluczowe informacje do wyświetlenia**:
  - nagłówek: identyfikacja (ikona/kolor), nazwa, status, terminy,
  - zakładki: Podstawowe / Harmonogram / Choroby / Historia,
  - akcje globalne: quick actions, „Edytuj” (w kontekście zakładki), „Usuń”.
- **Kluczowe komponenty widoku**:
  - `PlantHeader` + `PlantTabs`,
  - `BackLink` (na podstawie poprzedniego URL, fallback do `/app/plants` z zachowaniem query),
  - `QuickActions` (z blokadami i backdating),
  - `ConfirmDeleteModal` dla usuwania rośliny.
- **UX, dostępność i względy bezpieczeństwa**:
  - jeśli brak dostępu (`403`/„not found”): ekran 404‑like + CTA do `/app/plants`,
  - zachowanie query listy przy powrotach,
  - zakładki: na mobile przewijane lub dropdown.
- **Mapowanie na API**: bazowo `GET /api/plants/:id` dla nagłówka i podstawowych danych; zakładki dogrywają dane z własnych endpointów (lub korzystają z detalu, jeśli zawiera potrzebne relacje).
- **Powiązane wymagania/US**: US-023, US-036.

### 2.10. Zakładka: Podstawowe

- **Nazwa widoku**: Szczegóły – Podstawowe
- **Ścieżka widoku**: `/app/plants/:id?tab=basic`
- **Główny cel**: podgląd i edycja pól karty rośliny (bez harmonogramu i chorób jako osobnych edycji).
- **Kluczowe informacje do wyświetlenia**:
  - pola karty (nazwa, stanowisko, trudność, instrukcje, uwagi, identyfikacja),
  - neutralna prezentacja pustych pól (US-009).
- **Kluczowe komponenty widoku**:
  - read view sekcji + przycisk „Edytuj”,
  - formularz edycji (walidacja inline),
  - akcja „Anuluj” bez utraty danych.
- **UX, dostępność i względy bezpieczeństwa**:
  - długości pól zgodne z PRD (50/200/2000),
  - błędy `400` przy polach (inline), sukces toast tylko jeśli brak miejsca inline.
- **Mapowanie na API**: `GET /api/plants/:id`, `PUT /api/plants/:id`.
- **Powiązane wymagania/US**: US-014, US-015, US-033.

### 2.11. Zakładka: Harmonogram

- **Nazwa widoku**: Szczegóły – Harmonogram
- **Ścieżka widoku**: `/app/plants/:id?tab=schedule`
- **Główny cel**: ustawienie częstotliwości podlewania/nawożenia dla 4 sezonów jednocześnie.
- **Kluczowe informacje do wyświetlenia**:
  - 4 sezony (`spring/summer/autumn/winter`) z parami: `watering_interval`, `fertilizing_interval`,
  - informacja, że `0` wyłącza nawożenie w sezonie.
- **Kluczowe komponenty widoku**:
  - read view (podgląd tabelaryczny),
  - tryb edycji pełnego zestawu 4 sezonów:
    - desktop: tabela 4×2,
    - mobile: akordeon per sezon (jeden zapis),
  - inline walidacja pól liczbowych (tylko cyfry).
- **UX, dostępność i względy bezpieczeństwa**:
  - zawsze zapis kompletu 4 sezonów (spójność z API),
  - wyraźne komunikaty, gdy harmonogram niekompletny lub brak danych,
  - po zapisie: komunikat sukcesu (inline lub toast) + odblokowanie quick actions.
- **Mapowanie na API**: `GET /api/plants/:id/schedules`, `PUT /api/plants/:id/schedules`.
- **Powiązane wymagania/US**: US-010, US-024, US-025, US-030, US-033.

### 2.12. Zakładka: Choroby

- **Nazwa widoku**: Szczegóły – Choroby
- **Ścieżka widoku**: `/app/plants/:id?tab=diseases`
- **Główny cel**: zarządzanie listą chorób (CRUD per wpis) w formie akordeonu.
- **Kluczowe informacje do wyświetlenia**:
  - lista wpisów chorób: `name`, `symptoms`, `advice`,
  - daty (opcjonalnie) w formacie `DD.MM.RRRR`, jeśli prezentowane.
- **Kluczowe komponenty widoku**:
  - akordeon wpisów,
  - dodawanie inline (panel „Dodaj chorobę”),
  - edycja inline w panelu wpisu,
  - usuwanie z „inline confirm” (drugi klik w 5s), bez undo.
- **UX, dostępność i względy bezpieczeństwa**:
  - limity długości i błędy walidacji inline (`400`),
  - operacje mutacji nie powinny resetować scrolla w akordeonie,
  - brak ujawniania danych innych użytkowników (404‑like na brak dostępu do rośliny).
- **Mapowanie na API**:
  - `GET /api/plants/:id/diseases`
  - `POST /api/plants/:id/diseases`
  - `PUT /api/plants/:id/diseases/:diseaseId`
  - `DELETE /api/plants/:id/diseases/:diseaseId`
- **Powiązane wymagania/US**: US-012, US-013, US-033, US-036.

### 2.13. Zakładka: Historia

- **Nazwa widoku**: Szczegóły – Historia
- **Ścieżka widoku**: `/app/plants/:id?tab=history`
- **Główny cel**: przegląd logu działań pielęgnacyjnych.
- **Kluczowe informacje do wyświetlenia**:
  - lista ostatnich akcji (domyślnie limit 50): `action_type`, `performed_at`,
  - filtr typu akcji (podlewanie/nawożenie) w UI.
- **Kluczowe komponenty widoku**:
  - kontrolka filtra (chips/select),
  - lista wpisów historii (czytelna typografia dat `DD.MM.RRRR`).
- **UX, dostępność i względy bezpieczeństwa**:
  - jeśli filtr server-side nie jest dostępny/ustalony: fallback do client-side filtrowania w obrębie pobranych 50 rekordów,
  - stan pusty (brak akcji) z podpowiedzią użycia quick actions.
- **Mapowanie na API**: `GET /api/plants/:id/care-actions` (query: `action_type`, `limit`).
- **Powiązane wymagania/US**: US-023, US-026–US-029.

### 2.14. Usunięcie rośliny (modal/flow)

- **Nazwa widoku**: Potwierdzenie usunięcia
- **Ścieżka widoku**: (modal w `/app/plants/:id` lub z listy `/app/plants`)
- **Główny cel**: bezpieczne usunięcie rośliny.
- **Kluczowe informacje do wyświetlenia**: nazwa rośliny, ostrzeżenie o nieodwracalności.
- **Kluczowe komponenty widoku**:
  - modal potwierdzenia (CTA: Usuń / Anuluj),
  - po sukcesie toast + redirect do `/app/plants` (z zachowaniem query).
- **UX, dostępność i względy bezpieczeństwa**:
  - focus trap i poprawny powrót fokusu po zamknięciu,
  - obsługa błędów: `404` (już usunięta / brak dostępu) → komunikat neutralny + refresh listy.
- **Mapowanie na API**: `DELETE /api/plants/:id`.
- **Powiązane wymagania/US**: US-016, US-017.

## 3. Mapa podróży użytkownika

### 3.1. Główny przypadek użycia (MVP): dodaj roślinę → ustaw harmonogram → wykonaj akcję

1. **Wejście**: użytkownik trafia na `/` (landing).
2. **Auth**:
   - wybiera „Zaloguj” → `/auth/login` lub „Zarejestruj” → `/auth/register`,
   - po sukcesie redirect do `/app/dashboard` (lub `redirectTo` jeśli wszedł w prywatny URL).
3. **Pusty ogród**:
   - jeśli brak roślin: Dashboard pokazuje EmptyState + CTA „Dodaj roślinę” → `/app/plants/new`.
4. **Tworzenie rośliny**:
   - użytkownik wpisuje minimalnie `name` (pozostałe pola opcjonalne),
   - zapis → `POST /api/plants`,
   - redirect do `/app/plants/:id?tab=basic` + toast sukcesu + „nudge” do `schedule` i `diseases`.
5. **Ustawienie harmonogramu**:
   - przejście do zakładki Harmonogram → `/app/plants/:id?tab=schedule`,
   - edycja 4 sezonów w jednym zapisie → `PUT /api/plants/:id/schedules`,
   - po zapisie quick actions stają się dostępne.
6. **Wykonanie akcji**:
   - na dashboardzie lub w szczegółach klik „Podlano dziś” → `POST /api/plants/:id/care-actions` (bez `performed_at`),
   - UI odświeża status/terminy: roślina może zniknąć z `requires_attention`, a terminy aktualizują się w nagłówku i na kartach.

### 3.2. Backdating akcji (ważny przepływ)

1. Użytkownik wybiera alternatywną akcję „Ustaw datę” (np. ikona obok przycisku).
2. Otwiera się modal z selektorem daty (bez przyszłych dat).
3. Zapis → `POST /api/plants/:id/care-actions` z `performed_at=YYYY-MM-DD`.
4. Jeśli API zwraca `400`:
   - „Fertilizing disabled for this season” → inline komunikat w modalu,
   - „Missing schedule” → inline komunikat + CTA „Ustaw harmonogram” kierujące do `?tab=schedule`.

### 3.3. Utrzymanie i porządkowanie danych (CRUD)

- **Edycja podstawowych danych**: `/app/plants/:id?tab=basic` → `PUT /api/plants/:id`.
- **Zarządzanie chorobami**: `/app/plants/:id?tab=diseases` → `POST/PUT/DELETE` per wpis.
- **Usunięcie rośliny**:
  - z listy lub szczegółów → modal → `DELETE /api/plants/:id`,
  - po sukcesie → `/app/plants` (z zachowaniem query), toast 3s.

### 3.4. Odtwarzalność i powroty

- Lista roślin i dashboard zachowują `page/limit/search/sort/direction` w URL.
- Przycisk „Wróć” w szczegółach:
  - preferuje poprzedni URL,
  - fallback: `/app/plants` z ostatnim znanym query.

## 4. Układ i struktura nawigacji

### 4.1. Nawigacja globalna

- **Desktop (top nav)**: zakładki/pozycje: „Dashboard”, „Rośliny”.
- **Mobile (bottom nav)**: te same 2 główne entrypointy z dużymi ikonami/labelami.
- **CTA globalne**:
  - w `/app/plants`: przycisk „Dodaj roślinę” → `/app/plants/new`,
  - w dashboard EmptyState: „Dodaj roślinę” → `/app/plants/new`.

### 4.2. Nawigacja kontekstowa w roślinie

- **Zakładki** w `/app/plants/:id`:
  - `basic`, `schedule`, `diseases`, `history`,
  - stan aktywnej zakładki w query `tab=...` (linkowalne).
- **Akcje w nagłówku rośliny**:
  - quick actions (podlej/nawóź + backdate),
  - „Edytuj” (dla aktualnej zakładki),
  - menu „więcej” (mobile) z opcją „Usuń”.

### 4.3. Zasady redirectów i ochrony tras

- Brak sesji:
  - wejście na `/app/*` lub `/api/*` → redirect do `/auth/login?redirectTo=<requestedUrl>`.
- Brak dostępu do rośliny:
  - widok 404‑like + CTA do `/app/plants` (bez ujawniania istnienia zasobu).

## 5. Kluczowe komponenty

- **`AppShell`**: layout `/app/*` (top/bottom nav, stopka, toasty, obsługa redirectów).
- **`PlantCard`**: spójna karta rośliny (ikona/kolor, nazwa, status, terminy, quick actions, menu mobile).
- **`StatusIndicator`**: kolor jako główny sygnał + badge + tekst wspierający (A11y).
- **`DueDatesInline`**: subtelne terminy podlewania/nawożenia (format `DD.MM.RRRR`) + obsługa braków danych.
- **`QuickActions`**: akcje „dziś” + wejście do backdating; blokady przy braku harmonogramu i przy `fertilizing_interval=0`.
- **`BackdateCareActionModal`**: modal wyboru daty (bez przyszłych), inline obsługa `400`.
- **`PlantTabs`**: zakładki `basic/schedule/diseases/history` (responsywne).
- **`ReadView` + `EditMode`**: wspólny wzorzec „podgląd + Edytuj/Anuluj/Zapisz” dla sekcji.
- **`ScheduleEditor`**: edycja 4 sezonów w jednym zapisie (desktop tabela / mobile akordeon).
- **`DiseasesAccordion`**: lista chorób z dodawaniem/edycją inline + inline confirm dla usuwania.
- **`CareHistoryList`**: lista logów + filtr typu akcji.
- **`SearchBar` + `Pagination`**: komponenty list server-driven, stan w URL.
- **`EmptyState` / `Skeleton` / `InlineError` / `PageError`**: ujednolicone stany UI.
- **`ConfirmDialog`**: potwierdzenia destrukcyjnych akcji (usuwanie rośliny).
- **`BackLink`**: powrót oparty o poprzedni URL z fallbackiem do listy.

