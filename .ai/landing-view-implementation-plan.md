## Plan implementacji widoku Landing (po zalogowaniu) + nawigacja zakładkowa

## 1. Przegląd
Widok “Landing” w kontekście strefy prywatnej aplikacji to **pierwszy ekran po zalogowaniu** oraz **spójna rama nawigacyjna** pozwalająca szybko przełączać się między dwiema głównymi sekcjami:
- **Dashboard** (`/app/dashboard`) – priorytety (wymagają uwagi) + lista roślin + statystyki.
- **Rośliny** (`/app/plants`) – pełna lista roślin z wyszukiwaniem i paginacją.

Kluczowe cele:
- zapewnić **widoczne “zakładki” (tabs)** Dashboard/Rośliny (top nav na desktop + bottom nav na mobile),
- zapewnić **ochronę tras `/app/*`** (auth gate + redirect do logowania),
- zapewnić **globalne toasty** (sukces/błąd, ~3 sekundy),
- zachować **wydajność i odtwarzalność stanu** (query w URL: `page/limit/search/sort/direction`).

## 2. Routing widoku
### 2.1. Public / private
- **Publiczne**: `/` (landing marketingowy), `/auth/*` (login/register/reset)
- **Prywatne**: `/app/*`

### 2.2. Docelowe ścieżki “zakładek”
- **Dashboard**: `/app/dashboard`
- **Rośliny**: `/app/plants`

### 2.3. Wejście do strefy prywatnej (po logowaniu)
- Po udanym logowaniu użytkownik powinien trafić na **`/app/dashboard`** (zgodnie z PRD i user stories).
- Dodatkowo warto dodać “alias”:
  - `GET /app` → **redirect** do `/app/dashboard` (lub do “ostatnio odwiedzonej” zakładki, jeśli taki mechanizm wprowadzimy).

### 2.4. Auth gate / redirectTo
- Wejście na dowolny prywatny URL bez sesji:
  - redirect do: `/auth/login?redirectTo=<currentFullUrl>`
- Po udanym logowaniu:
  - jeśli jest `redirectTo` → redirect do `redirectTo`
  - w przeciwnym razie → `/app/dashboard`

## 3. Struktura komponentów
Zakładamy wdrożenie **App Shell** dla `/app/*` oraz użycie istniejących widoków treści dla konkretnych stron.

### 3.1. Wysokopoziomowe drzewo komponentów (diagram)
- `src/pages/app/dashboard.astro`
  - `AppLayout` (Astro)
    - `AppHeader`
      - `AppTopNav` (desktop)
    - `<slot />`
      - `DashboardView` (React, `client:load`)
        - `DashboardStats`
        - `RequiresAttentionSection`
          - lista `PlantCard` + `QuickActions`
        - `AllPlantsSection`
          - `DashboardToolbar`
          - lista `PlantCard` + `QuickActions`
          - `Pagination`
    - `AppBottomNav` (mobile)
    - `AppFooter`
    - `Toaster` (Sonner)

- `src/pages/app/plants.astro`
  - `AppLayout` (Astro)
    - `<slot />`
      - `PlantsListView` (React, `client:load`)
        - `PlantsToolbar`
        - `PlantsListContent`
          - lista `PlantCard` + `QuickActions`
          - `EmptyState` (brak wyników / pusty ogród)
        - `Pagination`
        - `ConfirmDeletePlantDialog`
    - `AppBottomNav` (mobile)
    - `AppFooter`
    - `Toaster` (Sonner)

## 4. Szczegóły komponentów
Poniżej komponenty wymagane do realizacji user stories i opisu widoku “Layout `/app/*`”.

### 4.1. `AppLayout` (Astro) – shell dla `/app/*`
- **Opis**: Główny layout strefy prywatnej. Odpowiada za: nawigację (zakładki), kontener treści, globalne toasty, stopkę oraz uruchomienie auth gate (server-side i/lub client fallback).
- **Główne elementy**:
  - `<header>`: logo + tytuł/crumbs + `AppTopNav`
  - `<main>`: `<slot />` na treść strony (Dashboard/Rośliny/itp.)
  - `<nav>`: `AppBottomNav` (tylko mobile)
  - `<footer>`: linki prawne
  - `Toaster` (Sonner)
- **Obsługiwane zdarzenia**:
  - brak bezpośrednich; “zdarzenia” to nawigacja przez `<a href="...">` w nav-ach
- **Warunki walidacji**:
  - `redirectTo` przekazywane do logowania musi być **URL-em w obrębie tej samej origin** lub bezpiecznie enkodowane (minimum: `encodeURIComponent`).
- **Typy**:
  - `AppNavItemVM` (nowy, opis w sekcji “Typy”)
- **Propsy**:
  - `title?: string` (dla `<title>` i nagłówka sekcji)
  - `activeRoute?: "dashboard" | "plants"` (opcjonalnie; jeśli nie podane, wyliczane z `Astro.url.pathname`)

### 4.2. `AppTopNav` (Astro) – zakładki desktop
- **Opis**: Pozioma nawigacja zakładkowa (Dashboard/Rośliny) widoczna na desktop, z wyraźnym stanem aktywnym.
- **Główne elementy**:
  - `<nav aria-label="Nawigacja aplikacji">`
  - linki `<a>` stylowane jak tabs
  - `aria-current="page"` dla aktywnej zakładki
- **Obsługiwane zdarzenia**:
  - klik w zakładkę → przejście do `/app/dashboard` lub `/app/plants`
- **Warunki walidacji**:
  - brak
- **Typy**:
  - `AppNavItemVM`
- **Propsy**:
  - `items: AppNavItemVM[]`
  - `activePathname: string`

### 4.3. `AppBottomNav` (Astro) – zakładki mobile
- **Opis**: Dolna nawigacja na mobile, duże cele dotyku, ikona + etykieta, stan aktywny.
- **Główne elementy**:
  - `<nav aria-label="Nawigacja aplikacji (mobile)">`
  - linki `<a>` w układzie 2-kolumnowym, sticky na dole
- **Obsługiwane zdarzenia**:
  - klik w zakładkę → przejście do `/app/dashboard` lub `/app/plants`
- **Warunki walidacji**:
  - brak
- **Typy**:
  - `AppNavItemVM`
- **Propsy**:
  - `items: AppNavItemVM[]`
  - `activePathname: string`

### 4.4. `AuthGate` (cross-cutting) – ochrona tras i redirect
Implementacja może być realizowana na 2 poziomach (rekomendowane oba):

#### 4.4.1. Middleware (Astro, server-side) – preferowane
- **Opis**: Jeśli request dotyczy `/app/*`, a użytkownik nie ma sesji, middleware od razu wykonuje redirect do logowania z `redirectTo`.
- **Zdarzenia**: request/response.
- **Walidacja**:
  - `redirectTo` ustawiane na “pełny” URL żądania (path + query + hash jeśli dostępny), zawsze bezpiecznie enkodowane.

#### 4.4.2. Fallback w widokach React (client-side) – już istnieje jako wzorzec
- **Opis**: Gdy API zwróci `401`, hook danych ustawia `authRequired`, a widok robi redirect do `/auth/login?redirectTo=<initialUrl>`.
- **Zdarzenia**:
  - `authRequired === true` → `window.location.href = ...`
- **Walidacja**:
  - `initialUrl` musi pochodzić z `Astro.url.toString()` (pełny URL), aby poprawnie odtworzyć stan.

### 4.5. `DashboardView` (React) – treść zakładki Dashboard
- **Opis**: Ekran startowy po logowaniu. Renderuje statystyki, sekcję “Wymagają uwagi” oraz listę “Wszystkie moje rośliny” sterowaną query w URL.
- **Główne elementy**:
  - `<main>` z nagłówkiem strony
  - `DashboardStats`
  - `RequiresAttentionSection`
  - `AllPlantsSection` + `DashboardToolbar` + `Pagination`
  - `EmptyState` gdy brak roślin
- **Obsługiwane zdarzenia**:
  - zmiana query (search/sort/pagination) → aktualizacja URL + refetch
  - klik CTA “Dodaj roślinę” → `/app/plants/new`
  - klik “Ustaw harmonogram” (gdy quick actions zablokowane) → `/app/plants/:id?tab=schedule`
  - quick actions (podlej/nawóź) → wywołanie mutacji i `refetch`
- **Warunki walidacji (zgodne z API)**:
  - `page` int ≥ 1
  - `limit` int 1..20 (max 20)
  - `search` string ≤ 50 (trim, pusty → brak parametru)
  - `sort`: `priority|name|created`
  - `direction`: `asc|desc`
  - przy `400` (złe query) → reset do defaultów i `replaceState`
- **Typy**:
  - DTO: `DashboardDto`, `ApiResponseDto<DashboardDto>`, `PaginationDto`
  - ViewModel: `DashboardViewModel`, `DashboardStatsVM`, `PlantCardVM`, `PaginationVM`, `DashboardQueryState`
  - Błędy: `ApiErrorViewModel`
- **Propsy**:
  - `initialUrl: string` (do redirectTo przy 401)

### 4.6. `PlantsListView` (React) – treść zakładki Rośliny
- **Opis**: Lista roślin z wyszukiwaniem, paginacją i akcjami (edytuj/usuń/quick actions).
- **Główne elementy**:
  - `<main>` z nagłówkiem i przyciskiem “Dodaj roślinę”
  - `PlantsToolbar` (search + sort)
  - `PlantsListContent` + `EmptyState` (pusto/brak wyników)
  - `Pagination`
  - `ConfirmDeletePlantDialog`
- **Obsługiwane zdarzenia**:
  - submit wyszukiwania → `search` w URL, reset `page=1`, refetch
  - clear wyszukiwania → usuń `search`, `page=1`
  - zmiana sort/direction → aktualizacja URL, `page=1`
  - paginacja → zmiana `page` w URL
  - “Dodaj roślinę” → `/app/plants/new`
  - “Edytuj” → `/app/plants/:id?tab=basic&edit=1`
  - “Usuń” → otwarcie dialogu + po sukcesie refetch
- **Warunki walidacji (zgodne z API)**:
  - `page` int ≥ 1
  - `limit` int 1..20
  - `search` string ≤ 50 (trim)
  - `sort`: `priority|name|created`
  - `direction`: `asc|desc`
  - przy `400` → reset query do defaultów
  - jeśli `page > totalPages` → automatyczny clamp do `totalPages`
- **Typy**:
  - DTO: `PlantCardListItemDto[]`, `ApiResponseDto<PlantCardListItemDto[]>`, `PaginationDto`
  - ViewModel: `PlantsListViewModel`, `PlantCardVM`, `PaginationVM`, `PlantsListQueryState`
  - Błędy: `ApiErrorViewModel`
- **Propsy**:
  - `initialUrl: string` (do redirectTo przy 401)

## 5. Typy
### 5.1. DTO (z `src/types.ts`) używane przez Landing (Dashboard/Plants)
- **`ApiResponseDto<T>`**:
  - `success: boolean`
  - `data: T | null`
  - `error: ApiErrorDto | null`
  - `pagination?: PaginationDto`
- **`DashboardDto`**:
  - `requires_attention: PlantCardListItemDto[]`
  - `all_plants: PlantCardListItemDto[]`
  - `stats: DashboardStatsDto`
- **`DashboardQueryDto`** (frontend mapuje na query string):
  - `page?: number`, `limit?: number`, `search?: string`, `sort?: "priority"|"name"|"created"`, `direction?: "asc"|"desc"`
- **`PlantListQueryDto`** (dla `/api/plants`):
  - `page?: number`, `limit?: number`, `search?: string`, `sort?: ...`, `direction?: ...`, `needs_attention?: boolean` (opcjonalne; w UI zakładek nie musi być eksponowane)
- **`PlantCardListItemDto`** (do kart w listach):
  - `id`, `name`, `icon_key`, `color_hex`, `difficulty`, `status_priority`,
  - `next_watering_at`, `next_fertilizing_at`, `last_*_at`, `created_at`, `updated_at`

### 5.2. ViewModel (istniejące) wykorzystywane w widoku
- **`DashboardViewModel`**:
  - `requiresAttention: PlantCardVM[]`
  - `allPlants: PlantCardVM[]`
  - `stats: DashboardStatsVM`
  - `pagination: PaginationVM`
  - `query: DashboardQueryState`
- **`PlantsListViewModel`**:
  - `items: PlantCardVM[]`
  - `pagination: PaginationVM`
  - `query: PlantsListQueryState`
- **`PlantCardVM`** (wspólne dla Dashboard i Rośliny):
  - identyfikacja: `id`, `name`, `iconKey`, `colorHex`, `difficulty`
  - status: `statusPriority (0|1|2)`, `statusLabel`, `statusTone`
  - terminy: `nextWateringAt`, `nextFertilizingAt`, `nextWateringDisplay`, `nextFertilizingDisplay`, `dueDatesTone`
  - linki: `links.detailsHref`, `links.scheduleHref`
- **`ApiErrorViewModel`**:
  - `code`, `message`, `details?`, `httpStatus?`

### 5.3. Nowe typy (zalecane) dla nawigacji zakładkowej
Dodaj w np. `src/lib/navigation/app-nav.ts` (lub `src/types.ts` jeśli mają być współdzielone szeroko):

- **`AppRouteKey`**:
  - `"dashboard" | "plants"`
- **`AppNavItemVM`**:
  - `key: AppRouteKey`
  - `label: string` (np. “Dashboard”, “Rośliny”)
  - `href: string` (np. `/app/dashboard`)
  - `ariaLabel?: string`
  - `icon?: "home" | "leaf"` (opcjonalnie; mapowane na ikony w komponencie)

## 6. Zarządzanie stanem
### 6.1. Stan zakładek (Dashboard vs Rośliny)
- **Źródło prawdy**: pathname (`/app/dashboard` lub `/app/plants`).
- Aktywny stan zakładki powinien być wyliczany w `AppLayout` z `Astro.url.pathname` i przekazywany do nav-ów.

### 6.2. Stan list (query w URL)
- Dashboard i Rośliny mają **oddzielne query state** trzymane w URL (`useDashboardQueryState`, `usePlantsQueryState`).
- Wymagania:
  - normalizacja wejścia (clamp `limit` do 20, `page >= 1`, trim `search` do 50),
  - przy `400` z API reset do defaultów,
  - obsługa `popstate` (back/forward).

### 6.3. Hooki / mechanizmy (custom)
- **`useDashboardData(query)`**:
  - pobiera `/api/dashboard`
  - flagi: `isLoading`, `isRefreshing`
  - `authRequired` przy `401`
  - `refetch()` po akcjach
- **`usePlantsData(query)`**:
  - pobiera `/api/plants`
  - analogiczne flagi + `refetch()`
- **Opcjonalnie (UX enhancement)**: `useLastVisitedTabUrl()`
  - zapisuje w `sessionStorage` ostatnio odwiedzony URL dla `dashboard/plants`
  - link w nav może kierować do “ostatniego” URL zamiast “gołego” `/app/plants`
  - nie jest wymagane przez API, ale poprawia UX przy powrotach.

## 7. Integracja API
### 7.1. `GET /api/dashboard`
- **Wywołanie**: `apiGet<DashboardDto>("/api/dashboard", query)`
- **Query params**:
  - `page`, `limit`, `search`, `sort`, `direction`
- **Odpowiedź**: `ApiResponseDto<DashboardDto>` + `pagination` na poziomie envelope (wg aktualnej implementacji endpointu).
- **Mapowanie**:
  - `DashboardDto` → `DashboardViewModel` przez `buildDashboardViewModel()`
  - `PlantCardListItemDto` → `PlantCardVM` przez `mapPlantCardDto()`

### 7.2. `GET /api/plants`
- **Wywołanie**: `apiGet<PlantCardListItemDto[]>("/api/plants", query)`
- **Query params**:
  - `page`, `limit`, `search`, `sort`, `direction` (opcjonalnie `needs_attention`, ale w tej nawigacji nie musi być eksponowane)
- **Odpowiedź**: `ApiResponseDto<PlantCardListItemDto[]>` + `pagination`
- **Mapowanie**:
  - `PlantCardListItemDto[]` → `PlantsListViewModel` przez `buildPlantsListViewModel()`

### 7.3. Auth przez cookies (frontend)
- `fetch(..., { credentials: "include" })` jest wymagane (już ustawione w `api-client`).
- Przy braku/wygaśnięciu sesji API zwraca `401`, co uruchamia redirect do `/auth/login?redirectTo=...`.

## 8. Interakcje użytkownika
### 8.1. Przełączanie zakładek (user stories)
- **Klik “Dashboard”**:
  - przejście do `/app/dashboard`
  - stan aktywnej zakładki aktualizuje się wizualnie (desktop + mobile)
- **Klik “Rośliny”**:
  - przejście do `/app/plants`
  - analogicznie aktywny stan

### 8.2. Wejście po zalogowaniu
- Użytkownik po logowaniu widzi Dashboard (`/app/dashboard`) i ma nawigację do Roślin.

### 8.3. Dashboard – podstawowe interakcje
- CTA w pustym ogrodzie: “Dodaj roślinę” → `/app/plants/new`
- Search/sort/paginacja w sekcji “Wszystkie”:
  - update URL query → refetch
- Quick actions (podlej/nawóź + modal backdating):
  - po sukcesie: refetch + toast sukcesu (jeśli brak lepszego miejsca inline)
  - po błędzie: toast lub inline (zależnie od kontekstu)

### 8.4. Rośliny – podstawowe interakcje
- Search/sort/paginacja:
  - update URL query → refetch
- CTA “Dodaj roślinę” → `/app/plants/new`
- Edycja: `/app/plants/:id?tab=basic&edit=1`
- Usuwanie: dialog → po sukcesie refetch + toast sukcesu

## 9. Warunki i walidacja
### 9.1. Walidacje query (wymagane przez API)
W obu zakładkach (Dashboard i Rośliny) UI musi wymuszać/normalizować:
- **`page`**: int ≥ 1
- **`limit`**: int 1..20 (max 20)
- **`search`**: trim, max 50, pusty string usuwa parametr
- **`sort`**: `priority | name | created`
- **`direction`**: `asc | desc`

Rekomendacja:
- walidacja/normalizacja w hooku query state (źródło prawdy = URL),
- dodatkowo defensywnie: jeśli API zwróci `400`, zresetować query do defaultów.

### 9.2. Warunki bezpieczeństwa na poziomie UI
- **401**:
  - redirect do `/auth/login?redirectTo=<current>`
- **403**:
  - dla widoków sekcyjnych (dashboard/lista): zachować się jak “brak sesji” lub pokazać PageError (bez ujawniania danych),
  - dla zasobów (np. szczegóły rośliny): ekran 404-like + CTA do `/app/plants`.

### 9.3. Wymagania UX
- czytelny aktywny stan zakładki (kolor + “underline”/badge, nie tylko kolor)
- na mobile: duże cele dotyku (min. ~44px)
- toasty: krótkie (ok. 3s), bez spamowania (deduplikacja na powtarzalnych błędach)

## 10. Obsługa błędów
### 10.1. Scenariusze błędów i reakcje UI
- **401 Unauthorized**:
  - natychmiastowy redirect do logowania z `redirectTo`
- **400 Validation error (złe query)**:
  - reset query do defaultów (np. `replaceState`) + refetch
  - opcjonalnie: toast informacyjny “Przywrócono domyślne filtry”
- **403 Forbidden**:
  - w kontekście list: PageError “Brak dostępu” lub redirect jak przy 401 (w zależności od docelowej polityki)
- **5xx / network**:
  - sekcyjny PageError + przycisk “Spróbuj ponownie”
  - toast error (z deduplikacją) jako dodatkowy sygnał
- **Pusta odpowiedź (brak `data` mimo 200)**:
  - traktować jako błąd “empty_response” (UI: komunikat + retry)

## 11. Kroki implementacji
1. **Dodaj / wydziel layout dla `/app/*`**:
   - utwórz `src/layouts/AppLayout.astro` (lub rozbuduj istniejący `Layout.astro` tak, by obsługiwał tryb “app”).
   - wstaw: `AppTopNav`, `AppBottomNav`, `AppFooter`, `Toaster`.
2. **Zaimplementuj nawigację zakładkową**:
   - utwórz komponenty Astro: `src/components/app/AppTopNav.astro`, `src/components/app/AppBottomNav.astro`
   - zdefiniuj listę `AppNavItemVM[]` (Dashboard/Rośliny)
   - aktywny stan na podstawie `Astro.url.pathname` + `aria-current`.
3. **Dodaj redirect `/app` → `/app/dashboard`**:
   - utwórz `src/pages/app/index.astro` z redirectem (server-side).
4. **Podłącz `AppLayout` do istniejących stron**:
   - `src/pages/app/dashboard.astro` i `src/pages/app/plants.astro` powinny używać `AppLayout` zamiast bazowego `Layout`.
5. **Auth gate (rekomendowane)**:
   - rozbuduj `src/middleware/index.ts` o warunek dla `/app/*`:
     - jeśli brak sesji → redirect do `/auth/login?redirectTo=...`
   - zostaw fallback w React hookach (401 z API) jako zabezpieczenie.
6. **Doprecyzuj UX active tab i mobile**:
   - sprawdź kontrast i a11y (role, aria-label, aria-current)
   - upewnij się, że bottom nav nie zasłania treści (padding-bottom w `<main>` na mobile).
7. **Zweryfikuj zgodność query z API**:
   - upewnij się, że `useDashboardQueryState` i `usePlantsQueryState` clampują `limit` do 20 i `search` do 50.
8. **Obsługa błędów i edge cases**:
   - potwierdź: `401` → redirect, `400` → reset query, `5xx` → PageError + retry.
9. **Smoke test manualny**:
   - wejście na `/app/dashboard` bez sesji → redirect do login z poprawnym `redirectTo`
   - przełączanie zakładek Dashboard ↔ Rośliny (desktop + mobile)
   - zachowanie `search/page` w URL i back/forward.

