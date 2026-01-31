## Plan testów – Greenie (Astro + React + Supabase)

### 1. Wprowadzenie i cele testowania
Celem testów jest potwierdzenie, że aplikacja Greenie umożliwia **bezpieczne (login-only)** zarządzanie roślinami (CRUD), harmonogramami sezonowymi, chorobami oraz logami pielęgnacji, a także poprawnie wylicza statusy/priorytety i prezentuje je na dashboardzie. Testy mają też zweryfikować **spójność kontraktu API** (`ApiResponseDto<T>`), walidacje (Zod) oraz zachowanie middleware (ochrona tras i redirect).

### 2. Zakres testów
- **W zakresie (in-scope)**:
  - **Autoryzacja i sesja** (Supabase Auth, cookies, ochrona tras w `src/middleware/index.ts`).
  - **Dashboard**: agregacje, sortowanie, paginacja, wyszukiwanie, lista “requires attention”.
  - **Rośliny (Plant cards)**: listowanie, tworzenie, szczegóły, aktualizacja, usuwanie.
  - **Harmonogramy sezonowe**: odczyt, aktualizacja, integralność 4 sezonów, unikalność sezonów.
  - **Choroby**: listowanie, tworzenie, edycja częściowa, usuwanie.
  - **Logi pielęgnacji**: listowanie, dodawanie (w tym backdating), przeliczenia terminów.
  - **UI/UX krytyczne**: formularze auth, toasty, stany puste, potwierdzenia usunięcia, responsywność.
  - **Bezpieczeństwo i izolacja danych** między użytkownikami (user_id).
- **Poza zakresem MVP (out-of-scope)**: funkcje społecznościowe, tryb gościa, powiadomienia push/email, aplikacja mobilna, upload zdjęć, seedowana baza roślin (zgodnie z `README.md`).

### 3. Typy testów do przeprowadzenia
- **Testy statyczne**: ESLint/Prettier (jako brama jakości), kontrola typów TypeScript.
- **Testy jednostkowe**:
  - logika dat i sezonów (`care-schedule.utils.ts`: `parseDateOnlyToUtc`, `getSeasonForDate`, `computeStatusPriority`)
  - reguły domenowe (np. “fertilizing disabled”, “performed_at nie w przyszłości”).
- **Testy integracyjne (backend/API)**:
  - endpointy `src/pages/api/**` z prawdziwą bazą (lokalny Supabase) lub środowiskiem testowym,
  - mapowanie błędów Supabase → kody HTTP i `error.code`.
- **Testy kontraktowe API**:
  - spójność `ApiResponseDto<T>`: zawsze `success/data/error`, opcjonalnie `pagination/message`,
  - zgodność kodów błędów (`validation_error`, `invalid_json`, `duplicate_season`, `performed_at_in_future`, itp.).
- **Testy E2E (UI + API)**:
  - pełne ścieżki użytkownika: rejestracja → login → CRUD roślin → harmonogramy → logi → dashboard.
- **Testy regresji** (przed releasem) + **testy eksploracyjne** (szczególnie obszary ryzyka: daty/sezony, autoryzacja, integralność harmonogramów).
- **Testy bezpieczeństwa**: kontrola dostępu, brak wycieków zasobów, cookie/sesja, podstawowe skany.
- **Testy dostępności (a11y)**: podstawowe WCAG (formularze, dialogi, focus, aria).
- **Testy wydajności i jakości**: Lighthouse (Core Web Vitals), czas ładowania dashboardu i list roślin.

### 4. Scenariusze testowe dla kluczowych funkcjonalności

#### 4.1 Autoryzacja, sesja i ochrona tras
- **Publiczne ścieżki**:
  - Wejście na `/`, `/auth/*`, `/api/auth/*` bez sesji nie wymusza redirectu (zgodnie z `isPublicPath`).
- **Ochrona tras prywatnych**:
  - Wejście na `/app/*` i `/api/*` bez sesji:
    - dla stron: redirect do `/?toast=auth-required` (middleware),
    - dla API: `401` z `error.code="unauthorized"` (np. `GET /api/dashboard`, `GET /api/plants`).
- **Logowanie (`POST /api/auth/login`)**:
  - poprawne dane → `200`, `success=true`, `data.user`.
  - błędne hasło/email → `401`, `invalid_credentials`.
  - “email not confirmed” → `401`, `email_not_confirmed`.
  - rate limit → `429`, `rate_limited`.
  - walidacja: brak email/hasła, niepoprawny email → `400`, `validation_error`.
- **Rejestracja (`POST /api/auth/register`)**:
  - hasło < 8 → `400`, `validation_error`.
  - `confirmPassword` ≠ `password` → `400`, `validation_error` z błędem na `confirmPassword`.
  - email zajęty → `409`, `email_already_in_use`.
  - po rejestracji, gdy `data.session` istnieje → użytkownik wylogowany (sprawdzenie, że brak aktywnej sesji po rejestracji).
- **Forgot password (`POST /api/auth/forgot-password`)**:
  - zawsze `200` z komunikatem (bez ujawniania istnienia konta),
  - walidacja email → `400` przy błędnym formacie.
- **Reset password (`POST /api/auth/reset-password`)**:
  - brak/niezgodne hasła → `400`, `validation_error`,
  - wygasła sesja → `401`, `unauthorized` z komunikatem o ponownym linku,
  - poprawny reset → `200`, message “Haslo zostalo zaktualizowane.”.

#### 4.2 Dashboard (`GET /api/dashboard`)
- **Walidacje query (Zod)**:
  - `page < 1`, `limit > 20`, `search > 50`, `sort/direction` spoza enum → `400`, `validation_error`.
- **Autoryzacja**: brak sesji → `401`, `unauthorized`.
- **Funkcjonalność**:
  - `requires_attention`: zwraca tylko rośliny z `next_watering_at` lub `next_fertilizing_at` ≤ koniec dnia UTC.
  - `stats`: poprawne zliczanie `urgent` i `warning` wg `computeStatusPriority`.
  - sortowanie: `priority` (domyślne), `name`, `created` + kierunek `asc/desc`.
  - paginacja: zgodność `pagination.total_pages` z `total/limit`, stabilność wyników.
- **Brzegi**:
  - brak roślin → `200` z pustymi listami i statystykami 0.
  - `search` trimuje białe znaki.

#### 4.3 Lista roślin (`GET /api/plants`)
- **Walidacje query**: `page/limit/sort/direction`, `needs_attention` tylko `true/false` → błędy `400`.
- **Autoryzacja**: `401` gdy brak sesji.
- **Sortowanie i paginacja**:
  - `sort=priority` sortuje w pamięci i dopiero potem tnie stronę (spójność wyników dla różnych `page/limit`).
  - `sort=name/created` sortuje w DB + tie-breaker po `name`.
- **Filtr `needs_attention=true`**:
  - zwraca rośliny z terminem ≤ koniec dnia UTC.

#### 4.4 Tworzenie rośliny (`POST /api/plants`)
- **Walidacja body**:
  - brak/empty `name` → `400`, `validation_error`.
  - `color_hex` nie pasuje do `^#[0-9A-Fa-f]{6}$` → `400`.
  - `watering_interval/fertilizing_interval` poza `0..365` → `400`.
  - niepoprawny JSON → `400`, `invalid_json`.
- **Sezony w schedules**:
  - duplikat sezonu w payload → `409`, `duplicate_season` (sprawdzenie przed DB).
- **Wynik**:
  - `201`, `data` zawiera roślinę + ewentualne `schedules`, `diseases`, `recent_care_logs=[]`.
- **Bezpieczeństwo**:
  - tworzenie przypisuje `user_id` do aktualnego użytkownika (brak możliwości nadpisania po stronie klienta).

#### 4.5 Szczegóły rośliny i CRUD (`/api/plants/:id`)
- **GET**:
  - `id` nie-UUID → `400`, `invalid_id`.
  - brak sesji → `401`.
  - zasób nie należy do usera → `404` (bez przecieku, “Plant not found.”).
  - `recent_care_logs` maks 5 pozycji.
- **PUT**:
  - body ma być **strict** (nadmiarowe pola → `400`, `validation_error`).
  - pusty JSON `{}`: akceptowalny tylko jeśli logika nie wymaga pól (weryfikacja oczekiwanego zachowania biznesowego).
  - duplikat sezonów w `schedules` → `409`, `duplicate_season`.
  - po podmianie `schedules`: przeliczenie `next_*` na podstawie `last_*` i sezonu daty.
- **DELETE**:
  - brak sesji → `401`,
  - cudzy zasób → `404`,
  - poprawne usunięcie → `200`, `message="Plant deleted"`,
  - weryfikacja kaskady (jeśli zdefiniowana w DB): brak osieroconych `seasonal_schedule`, `disease_entry`, `care_log`.

#### 4.6 Harmonogramy (`/api/plants/:id/schedules`)
- **GET**:
  - brak sesji → `401`,
  - roślina nie istnieje / cudza → `404`, `not_found`,
  - **integralność**: jeśli w DB nie ma dokładnie 4 sezonów lub są duplikaty → `500`, `schedule_incomplete` z `details` (missing/duplicates).
  - poprawny wynik: zawsze 4 wpisy, w kolejności `spring, summer, autumn, winter`.
- **PUT**:
  - niepoprawny JSON → `400`, `invalid_json`,
  - `schedules` min 1 max 4, zakresy 0..365 → `400`, `validation_error`,
  - duplikat sezonu → `409`, `duplicate_season` + `details.fieldErrors.schedules`,
  - po update: przeliczenie `next_*` jeśli zmieniły się wartości wynikowe.

#### 4.7 Choroby (`/api/plants/:id/diseases` i `/api/plants/:id/diseases/:diseaseId`)
- **GET**:
  - `id` nie-UUID → `400`, `invalid_id`,
  - brak sesji → `401`,
  - cudzy zasób → `404` (kod `plant_not_found`).
- **POST**:
  - niepoprawny JSON → `400`, `invalid_body`,
  - walidacja `name` (min 1, max 50), `symptoms/advice` max 2000,
  - `symptoms/advice` puste stringi → zapis jako `null` (transform w Zod) i weryfikacja w odpowiedzi.
  - wynik `201` z nową chorobą.
- **PUT (partial update)**:
  - body `{}` → `400`, `invalid_body` (“At least one field must be provided.”),
  - aktualizacja pojedynczego pola (np. tylko `advice`) → `200`,
  - błędne `diseaseId`/`id` → `400`, `invalid_id`,
  - zasób nie istnieje → `404` z rozróżnieniem `plant_not_found` vs `disease_not_found`.
- **DELETE**:
  - poprawne usunięcie → `200`, `message="Disease removed."`,
  - brak dostępu → `404`.

#### 4.8 Logi pielęgnacji (`/api/plants/:id/care-actions`)
- **GET**:
  - query `limit` 1..200, `action_type` enum → walidacja `400`.
  - sortowanie: newest-first po `performed_at` i `created_at`.
- **POST**:
  - body: `action_type` required (`watering|fertilizing`), `performed_at` opcjonalne w formacie `YYYY-MM-DD`.
  - `performed_at` w przyszłości → `400`, `performed_at_in_future` + `details.today`.
  - brak harmonogramu dla sezonu → `400`, `schedule_missing`.
  - nawożenie przy `fertilizing_interval=0` → `400`, `fertilizing_disabled`.
  - poprawny insert:
    - `201`,
    - `data.care_log` utworzony,
    - `data.plant` zaktualizowane `last_*` i `next_*` zależnie od akcji.
- **Backdating**:
  - dodanie logu z przeszłości przelicza daty na podstawie `performed_at` (UTC).
- **Bezpieczeństwo**:
  - cudza roślina → `404` (brak ujawniania istnienia).

#### 4.9 Kontrakt klienta API (`src/lib/api/api-client.ts`)
- `credentials: "include"`: testy E2E muszą weryfikować, że sesja cookie działa w przeglądarce.
- `parseJson`:
  - gdy endpoint zwraca nie-JSON / pusty body → `response=null`, ale nadal poprawny `httpStatus` i `error` dla `!ok`.
- `buildUrl`:
  - ignorowanie `undefined/null/""` w query parametrach.
- Obsługa komunikatów po polsku w UI dla typowych błędów (np. `validation_error`).

#### 4.10 UI/UX (Astro + React)
- **Formularze auth**:
  - walidacje klienta (jeśli są) vs walidacje serwera: spójność komunikatów,
  - poprawna obsługa kodów 401/409/429 w UI (toast/inline error).
- **Rośliny**:
  - tworzenie/edycja: walidacje długości pól, `color_hex`, enumy.
  - potwierdzenia usunięcia, stany puste.
- **Dashboard**:
  - sortowanie, paginacja, wyszukiwanie; responsywność i czytelność statusów.
- **A11y**:
  - focus management w dialogach (Radix), etykiety pól, nawigacja klawiaturą, kontrast.

### 5. Środowisko testowe
- **Local dev**:
  - Node.js `22.14.0` (z `.nvmrc`), `npm`,
  - uruchomienie: `npm run dev`,
  - **Supabase**: rekomendowane uruchomienie lokalne (Supabase CLI + Docker) lub osobny projekt “test” w Supabase (izolowany od produkcji).
- **Staging**:
  - wdrożenie Docker na DigitalOcean,
  - zmienne środowiskowe `SUPABASE_URL`, `SUPABASE_KEY`,
  - testy regresji przed releasem.
- **Przeglądarki (minimum)**:
  - Chrome, Firefox, Safari (macOS), + test responsywności (mobile viewport).
- **Dane testowe**:
  - co najmniej 2 konta użytkowników (A i B) dla testów izolacji,
  - rośliny z różnymi konfiguracjami: brak harmonogramu, pełne 4 sezony, nawożenie wyłączone (0), terminy w przeszłości/dziś/przyszłości.

### 6. Narzędzia do testowania
- **E2E**: Playwright (rekomendowane dla Astro/React) + trace/video dla flaky testów.
- **Unit/Integration (TS)**: Vitest + (opcjonalnie) Testing Library (React) oraz MSW do mockowania fetch w testach UI.
- **Testy API (manual/automaty)**: Postman/Insomnia, kolekcja z predefiniowanymi przypadkami walidacji.
- **DB/Backend**: Supabase CLI do lokalnych środowisk, migracji i seedów.
- **Jakość i bezpieczeństwo**:
  - ESLint/Prettier (już w repo),
  - Lighthouse CI (wydajność),
  - OWASP ZAP baseline (opcjonalnie na staging).
- **CI/CD**: GitHub Actions (pipeline: lint + testy + build + ewentualnie E2E na preview).

### 7. Harmonogram testów
- **Faza 0 – przygotowanie (1–2 dni)**:
  - konfiguracja środowiska testowego Supabase, dane testowe, wybór narzędzi (Playwright/Vitest).
- **Faza 1 – testy krytyczne (2–4 dni)**:
  - Auth + middleware + podstawowy CRUD roślin + podstawowe API contract tests.
- **Faza 2 – logika domenowa (2–3 dni)**:
  - harmonogramy (integralność 4 sezonów), care-actions (backdating, disabled fertilizing), dashboard (stats/priority).
- **Faza 3 – regresja i niefunkcjonalne (1–2 dni / przed releasem)**:
  - E2E smoke + a11y smoke + Lighthouse, testy bezpieczeństwa podstawowe.
- **Ciągłe**:
  - uruchamianie smoke suite na każdy PR, pełna regresja na release candidate.

### 8. Kryteria akceptacji testów
- **Krytyczne ścieżki (Auth + CRUD + care-actions + dashboard)**: 100% scenariuszy smoke przechodzi na staging.
- **Brak błędów blokujących**:
  - 0 błędów Sev-1/Sev-2 otwartych przed releasem.
- **Kontrakt API**:
  - wszystkie endpointy zwracają poprawny `ApiResponseDto` i spójne kody błędów.
- **Bezpieczeństwo**:
  - potwierdzona izolacja danych (brak dostępu user B do zasobów user A; oczekiwane `404/401` zależnie od endpointu).
- **Jakość UI**:
  - brak regresji w responsywności i podstawowych wymogach a11y (formularze, dialogi).

### 9. Role i odpowiedzialności
- **QA Engineer**:
  - przygotowanie planu, przypadków testowych, automatyzacja smoke/E2E, raporty.
- **Developerzy**:
  - testy jednostkowe/integracyjne logiki domenowej i API, poprawki, przegląd flaky testów.
- **Tech Lead**:
  - definicja bram jakości w CI, decyzje dot. narzędzi i zakresu regresji.
- **Product Owner / PM**:
  - kryteria akceptacji, priorytety scenariuszy, akceptacja release.
- **DevOps/Platform**:
  - staging/prod, konfiguracje Supabase/DigitalOcean, obserwowalność.

### 10. Procedury raportowania błędów
- **Kanał**: GitHub Issues (lub PR comments dla błędów regresyjnych w trakcie review).
- **Wymagane informacje w zgłoszeniu**:
  - kroki odtworzenia, oczekiwany vs aktualny rezultat,
  - środowisko (local/staging), przeglądarka, wersja,
  - payload requestu i response (w tym `httpStatus`, `error.code`, `error.details`),
  - jeśli dostępne: `x-request-id` (aplikacja go loguje w części endpointów),
  - zrzuty ekranu/wideo (dla UI), logi konsoli.
- **Klasyfikacja**:
  - Sev-1 (blokuje logowanie/CRUD), Sev-2 (błędne wyliczenia terminów/statusów), Sev-3 (UI/UX), Sev-4 (kosmetyka).
- **SLA**:
  - Sev-1: hotfix natychmiast / tego samego dnia,
  - Sev-2: do następnego release candidate,
  - Sev-3/4: wg priorytetu backlogu.
  