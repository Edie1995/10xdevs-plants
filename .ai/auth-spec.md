# Specyfikacja techniczna: Rejestracja / Logowanie / Odzyskiwanie hasła / Zmiana hasła (Supabase Auth + Astro)

## Cel i zakres
Celem jest zaprojektowanie modułu autentykacji, który spełnia wymagania PRD:
- **US-037**: dedykowane strony logowania i rejestracji, e-mail + hasło + potwierdzenie hasła, przycisk logowania i wylogowania w prawym górnym rogu, odzyskiwanie hasła, **bez zewnętrznych providerów** (Google/GitHub itd.).
- **US-036**: brak dostępu do dashboardu i kolekcji roślin bez logowania, a także **ochrona przed dostępem do cudzych danych** (izolacja danych per użytkownik).
- **US-001 / US-002 / US-004 / US-006**: rejestracja, logowanie, odzyskiwanie hasła, ochrona dostępu (pokryte przez routing + API).
- **US-005 (częściowo)**: zmiana hasła (wymaga podania aktualnego hasła). Nick nie jest częścią profilu i nie jest obsługiwany w MVP.



Stack: **Astro 5 (output: server) + React 19 + TypeScript 5 + Tailwind 4 + shadcn/ui + Supabase (Postgres + Auth)**.

To jest **architektura/specyfikacja** (bez implementacji), ale z jednoznacznym wskazaniem komponentów, modułów, kontraktów i odpowiedzialności.

## Kontekst i ograniczenia wynikające z obecnego kodu (nie wolno zepsuć istniejących funkcji)
- Widoki aplikacji działają jako **Astro strony** z osadzonymi komponentami **React client:load** (np. `DashboardView`, `PlantsListView`).
- Fetch po stronie klienta używa `credentials: "include"` (`src/lib/api/api-client.ts`) — to jest kluczowe dla sesji opartej o cookies.
- Backend API już używa spójnej koperty odpowiedzi `ApiResponseDto<T>` (`src/types.ts`) i walidacji wejścia przez **Zod** w endpointach.
- Obecnie API korzysta z tymczasowego `DEFAULT_USER_ID` (`src/db/supabase.client.ts`), więc auth ma zastąpić to mechanizmem sesji.
- `src/middleware/index.ts` aktualnie tylko wstrzykuje `context.locals.supabase`, ale bez mechanizmu sesji/cookies.
- W Reactowych widokach istnieje już wzorzec: przy `401` ustawiane jest `authRequired`, a UI robi redirect na `/auth/login?redirectTo=...`.

## Wymagania jakości i bezpieczeństwa
- Brak providerów OAuth (Google itd.) — tylko e-mail/hasło.
- Sesja użytkownika musi być obsługiwana w sposób bezpieczny i spójny dla SSR + API.
- Ochrona zasobów (US-036) musi działać:
  - na poziomie routingu (blokada `/app/*` i odpowiedzi `401/302`),
  - na poziomie danych (RLS w Supabase + filtrowanie po `user_id` / kontrola własności).
- Brak “open redirect” przez `redirectTo` (tylko ścieżki względne w obrębie aplikacji).

---

## 1. ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

### 1.1. Docelowy podział routingu (public / auth / private)

#### Public (non-auth)
- `GET /` — landing page (obecnie `src/pages/index.astro` + `Welcome.astro`).
  - Jeśli użytkownik jest zalogowany: **redirect 302 do `/app/dashboard`** (żeby nie oglądał landingu).
  - Jeśli niezalogowany: landing + CTA do logowania/rejestracji.

#### Auth (public, ale specyficzne)
Wszystkie strony auth są **dedykowane** (wymóg US-037) i nie wymagają zalogowania:
- `GET /auth/login` — logowanie
- `GET /auth/register` — rejestracja
- `GET /auth/forgot-password` — formularz wysłania linku resetu
- `GET /auth/reset-password` — ustawienie nowego hasła (wejście przez link recovery)
- `GET /auth/callback` — callback do wymiany `code` na sesję Supabase (logowanie i recovery)

Zachowanie, gdy user jest już zalogowany:
- wejście na `/auth/*` powinno robić **redirect 302 do `/app/dashboard`** (nie ma sensu pokazywać form).

#### Private (auth-only)
Wszystkie ścieżki pod `/app/*` wymagają sesji:
- `/app/dashboard`
- `/app/plants`
- `/app/plants/new`
- `/app/plants/:id`

Wymóg US-037 mówi o “kolekcji roślin i dashboardzie” — w praktyce dotyczy całego `/app/*`.

### 1.2. Layouty i zmiany UI (auth vs non-auth)

#### `src/layouts/Layout.astro` (tryb non-auth + strony auth)
Aktualnie layout ma tylko logo i slot.
Rozszerzenia (bez zmiany istniejącej roli layoutu):
- **Prawy górny róg**:
  - dla niezalogowanych: linki “Zaloguj się” i “Załóż konto”
  - dla zalogowanych (jeśli wejdą na public): “Przejdź do aplikacji” (opcjonalnie) lub automatyczny redirect
- CTA na landingu powinno kierować na `/auth/login` lub `/auth/register`.

Opcjonalny wariant (czytelniejsza separacja, ale nieobowiązkowy):
- dodać `src/layouts/AuthLayout.astro` jako thin-wrapper na `Layout.astro` z nagłówkiem i max-width dla formularzy.

#### `src/layouts/AppLayout.astro` (tryb auth / aplikacja)
Wymóg US-037: **wylogowanie w prawym górnym rogu w głównym `AppLayout.astro`**.
Rozszerzenia:
- W headerze, obok `AppTopNav`, dodać strefę “konto”:
  - stan zalogowany: przycisk “Wyloguj” (minimum) lub dropdown “Użytkownik” + “Wyloguj”
  - stan niezalogowany (awaryjnie, jeśli layout został wyrenderowany bez sesji): link “Zaloguj się”

Komponenty rekomendowane:
- `src/components/auth/AuthButton.astro` (Astro) — renderuje link lub przycisk wylogowania w headerze (SSR-friendly)
- `src/components/auth/LogoutButton.tsx` (React) — jeśli chcemy obsługiwać wylogowanie bez pełnego przeładowania (call `/api/auth/logout` + redirect)

#### Ujednolicenie layoutów na `/app/plants/new` i `/app/plants/:id`
Obecnie `src/pages/app/plants/new.astro` i `src/pages/app/plants/[id].astro` używają `Layout.astro`, a `/app/plants` i `/app/dashboard` używają `AppLayout.astro`.
Docelowo (żeby spełnić spójność “app shell” i wymaganie US-037 o logout w AppLayout):
- `/app/plants/new` i `/app/plants/:id` powinny używać `AppLayout.astro`.
To jest zmiana UI, ale nie narusza kontraktów API ani działania React komponentów (ciągle dostaną `initialUrl` itp.).

### 1.3. Dokładne rozdzielenie odpowiedzialności: Astro vs React

#### Astro (strony i layouty) odpowiada za:
- **SSR i routing**:
  - redirecty zależne od sesji: public ↔ app, auth ↔ app, private → login
- **Bezpieczne przekazanie parametrów nawigacji**:
  - `redirectTo` jako query param (po walidacji “relative-only”)
- **Osadzenie React formularzy** i przekazanie im minimalnych propsów:
  - `redirectTo`, `initialEmail` (opcjonalnie), `next` (dla callback)
- **Callback flow**:
  - `/auth/callback` jako Astro strona wykonująca wymianę kodu na sesję i ustawienie cookies

#### React (komponenty client-side) odpowiada za:
- interakcję użytkownika: inputy, walidacja client-side, loading states, disable submit
- wysyłkę żądań do API auth (fetch) oraz obsługę toasts
- nawigację po sukcesie: `window.location.href = ...` (spójne z istniejącym stylem w repo)

### 1.4. Strony i komponenty (proponowana struktura)

#### Astro pages (nowe)
- `src/pages/auth/login.astro`
- `src/pages/auth/register.astro`
- `src/pages/auth/forgot-password.astro`
- `src/pages/auth/reset-password.astro`
- `src/pages/auth/callback.astro`

#### Astro pages (nowe, private)
- `src/pages/app/profile.astro` (zmiana hasła)

Wszystkie: rekomendowane `export const prerender = false;` (dla pewności SSR w trybie `output: "server"`).

#### React components (nowe)
Folder: `src/components/auth/`
- `LoginForm.tsx`
- `RegisterForm.tsx`
- `ForgotPasswordForm.tsx`
- `ResetPasswordForm.tsx`
- `ChangePasswordForm.tsx` (zmiana hasła z podaniem aktualnego hasła)
- (opcjonalnie) `AuthFormShell.tsx` — wspólny układ formularzy (Card, nagłówek, stopka, linki)

#### Lib/services (nowe)
Folder: `src/lib/auth/`
- `auth-client.ts` — cienki wrapper do wywołań `/api/auth/*` (analogicznie do pozostałych usług)
- `redirect.ts` — walidacja/sanitizacja `redirectTo`
- `auth-errors.ts` — mapowanie kodów błędów na komunikaty UX (opcjonalnie, jeśli chcemy centralizować)

### 1.5. Walidacje i komunikaty błędów (UI)

#### Walidacje client-side (React)
Wspólny cel: szybki feedback, ale źródłem prawdy jest walidacja serwerowa (Zod).

**Logowanie (`/auth/login`)**
- email:
  - wymagany
  - format e-mail
- hasło:
  - wymagane
- komunikaty:
  - “Podaj adres e-mail.”
  - “Podaj poprawny adres e-mail.”
  - “Podaj hasło.”

**Rejestracja (`/auth/register`)**
- email: jw.
- hasło:
  - wymagane
  - minimalne wymagania (proponowane): min 8 znaków
- potwierdzenie hasła:
  - wymagane
  - musi być równe `password`
- komunikaty:
  - “Hasła muszą być takie same.”
  - “Hasło musi mieć co najmniej 8 znaków.”

**Odzyskiwanie hasła (`/auth/forgot-password`)**
- email: wymagany + format
- UX/security: niezależnie czy e-mail istnieje, pokazujemy ten sam komunikat sukcesu, np.:
  - “Jeśli konto istnieje, wysłaliśmy instrukcję resetu hasła.”

**Reset hasła (`/auth/reset-password`)**
- nowe hasło + potwierdzenie: jak w rejestracji
- dodatkowo: stan “brak aktywnej sesji recovery” → CTA “Wyślij link ponownie” (prowadzi do forgot-password)

**Zmiana hasła (`/app/profile`) (US-005 częściowo)**
- zmiana hasła:
  - `currentPassword`: wymagane
  - `newPassword` + `confirmNewPassword`: jak w rejestracji (min 8)
  - jeśli user nie ma hasła (konto email-only zawsze ma; ten edge-case dotyczyłby OAuth, który jest poza zakresem) — można pominąć

#### Walidacje i błędy serwerowe (prezentacja w UI)
Zgodnie z PRD: toast sukcesu/błędu widoczny ~3s (Sonner już istnieje).
Wzorzec:
- 400 `validation_error` → pokazujemy “Popraw błędy w formularzu.” + (opcjonalnie) mapowanie fieldErrors na inputy
- 401 `unauthorized`:
  - na stronach app: obsługiwane automatycznie przez istniejący `authRequired` → redirect do login
  - na stronach auth: komunikat ogólny (np. “Sesja wygasła. Zaloguj się ponownie.”)
- 409:
  - rejestracja: “Konto z tym e-mailem już istnieje.”
- 429/rate limit: “Zbyt wiele prób. Spróbuj ponownie za chwilę.”
- 5xx: “Coś poszło nie tak. Spróbuj ponownie.”

### 1.6. Najważniejsze scenariusze (happy-path i edge-cases)

#### S1: Wejście niezalogowanego na `/app/dashboard`
- Middleware blokuje (server-side):
  - dla stron HTML: redirect 302 do `/auth/login?redirectTo=/app/dashboard`
  - dla API: 401 JSON
- Dodatkowo (fallback): istniejący mechanizm React po 401 przekieruje na login.

#### S2: Logowanie
- User wypełnia formularz → `POST /api/auth/login`
- Sukces:
  - cookies sesji ustawione
  - redirect do `redirectTo` (jeśli poprawny) lub `/app/dashboard`
- Błąd:
  - toast “Nieprawidłowy e-mail lub hasło.” (bez zdradzania szczegółów)

#### S3: Rejestracja (auto-login)
Wymóg PRD (US-001): po rejestracji user jest zalogowany.
- `POST /api/auth/register` powinno kończyć się sesją (cookies)
- jeśli Supabase ma włączone potwierdzanie e-mail:
  - to jest niezgodne z US-001; należy w konfiguracji Supabase wyłączyć email confirmation dla MVP
  - lub w UI jasno pokazać “Sprawdź e-mail…” (wariant awaryjny)

#### S6: Zmiana hasła (US-005 częściowo)
- User wchodzi na `/app/profile`
- Zmiana hasła:
  - UI wymaga `currentPassword` oraz `newPassword` + `confirmNewPassword`
  - `POST /api/auth/change-password` weryfikuje `currentPassword`, następnie ustawia nowe hasło
- Sukces: toast sukcesu
- Błąd: toast błędu (bez ujawniania czy hasło było błędne w sposób zbyt szczegółowy)

#### S4: Wylogowanie
- Klik “Wyloguj” w prawym górnym rogu `AppLayout.astro`
- `POST /api/auth/logout` → czyszczenie cookies
- redirect do `/` (landing) lub `/auth/login`

#### S5: Reset hasła
- `/auth/forgot-password` → `POST /api/auth/forgot-password`
- User dostaje link na e-mail, który prowadzi do `/auth/callback?...`
- `/auth/callback` wymienia kod na sesję recovery → redirect do `/auth/reset-password`
- `/auth/reset-password` → `POST /api/auth/reset-password` (wymaga sesji) → sukces → redirect do `/app/dashboard`

---

## 2. LOGIKA BACKENDOWA

### 2.1. Struktura endpointów API (nowe i rozszerzenia)

#### Nowe endpointy auth (Astro API routes)
Folder: `src/pages/api/auth/`
- `POST /api/auth/login`
  - body: `{ email: string; password: string; redirectTo?: string }`
  - efekt: ustanowienie sesji w cookies
  - response: `ApiResponseDto<{ user: UserProfileDto }>`
- `POST /api/auth/register`
  - body: `{ email: string; password: string; confirmPassword: string; redirectTo?: string }`
  - efekt: utworzenie konta + auto-login (cookies)
  - response: `ApiResponseDto<{ user: UserProfileDto }>`
- `POST /api/auth/logout`
  - body: brak
  - efekt: signOut + czyszczenie cookies
  - response: `ApiResponseDto<null>` + opcjonalnie `message`
- `POST /api/auth/forgot-password`
  - body: `{ email: string }`
  - efekt: wysyłka maila z linkiem resetu (nie ujawniamy czy konto istnieje)
  - response: `ApiResponseDto<null>` + `message`
- `POST /api/auth/reset-password`
  - body: `{ password: string; confirmPassword: string }`
  - warunek: aktywna sesja recovery (ustawiona przez `/auth/callback`)
  - response: `ApiResponseDto<null>` + `message`
- `POST /api/auth/change-password` (US-005)
  - body: `{ currentPassword: string; newPassword: string; confirmNewPassword: string }`
  - warunek: aktywna sesja
  - efekt: weryfikacja aktualnego hasła + ustawienie nowego hasła
  - response: `ApiResponseDto<null>` + `message`
- (opcjonalnie) `GET /api/auth/me`
  - response: `ApiResponseDto<{ user: UserProfileDto } | null>`
  - przydatne do renderowania headera bez “pełnego” SSR, ale przy SSR zwykle zbędne

#### Aktualizacja istniejących endpointów (US-036)
Wszystkie endpointy data (dashboard + plants + nested) muszą korzystać z **user id z sesji**, nie z `DEFAULT_USER_ID`.
Docelowy standard:
- jeśli brak sesji → `401 unauthorized` (spójne z istniejącym `authRequired` w React)
- jeśli zasób nie należy do usera → **404** (nie ujawniamy istnienia) lub 403 mapowane na 404 (jak już bywa w kodzie)

Najważniejsze miejsca:
- `GET /api/dashboard` — zamiast `DEFAULT_USER_ID` użyć usera z sesji
- `GET /api/plants` / `POST /api/plants` — userId z sesji
- `GET /api/plants/:id` — obecnie `getPlantDetail()` nie sprawdza ownership; trzeba:
  - albo dodać parametr `userId` i wykonać `assertPlantOwnershipOrNotFound` na początku
  - albo polegać na RLS (zalecane), ale i tak mapować 403 → 404
- wszystkie nested: schedules, diseases, care-actions — analogicznie

### 2.2. Mechanizm walidacji danych wejściowych
Standard projektu: **Zod** w API routes (już istnieje).
Rekomendacja: ustandaryzować schematy auth w `src/lib/auth/auth.schemas.ts`:
- `emailSchema = z.string().trim().email().max(254)`
- `passwordSchema = z.string().min(8).max(72)` (72 jest bezpiecznym limitem dla bcrypt-like, choć Supabase to obsłuży; limit UI i tak warto mieć)
- `confirmPassword` z `.refine((d) => d.password === d.confirmPassword, ...)`

Walidacje `redirectTo`:
- tylko ścieżki względne (np. `/app/dashboard`)
- zakaz `http://`, `https://`, `//`, `..`, znaki kontrolne
- fallback do `/app/dashboard`

### 2.3. Obsługa wyjątków i spójne błędy
W API routes trzymać się istniejącego envelope `ApiResponseDto`.

Rekomendowane komponenty wspólne (redukcja duplikacji w API):
- `src/lib/api/json-response.ts`
  - `jsonResponse(status, payload)`
  - `errorResponse(status, code, message, details?)`
- `src/lib/api/supabase-error-map.ts`
  - mapowanie supabase error → `{ status, code, message, details }`

Minimalny standard logowania błędów:
- logujemy route + request_id (jeśli jest) + user_id (jeśli jest) + params
- nie logujemy haseł i payloadów z secretami

### 2.4. SSR / renderowanie stron z uwzględnieniem `astro.config.mjs`
`astro.config.mjs` ma:
- `output: "server"`
- adapter `@astrojs/node` w trybie `standalone`

Konsekwencje:
- możemy i powinniśmy robić **server-side redirects** (302) zależne od sesji
- strony auth i app nie powinny być prerenderowane; ustawiamy `export const prerender = false` na:
  - wszystkie `src/pages/auth/*.astro`
  - wszystkie API routes (już jest w większości)

---

## 3. SYSTEM AUTENTYKACJI (Supabase Auth + Astro)

### 3.1. Model sesji i integracja z Astro middleware
Cel: `context.locals.supabase` ma być klientem Supabase “server-side”, który:
- korzysta z cookies requestu (żeby odczytać sesję),
- potrafi zapisać zmiany w cookies (np. po loginie/refreshu tokena),
- pozwala w API routes i stronach Astro wykonać `supabase.auth.getUser()` / `getSession()`.

Rekomendowana implementacja koncepcyjna:
- `src/db/supabase.server.ts`:
  - fabryka `createSupabaseServerClient({ request, cookies })`
  - wewnętrznie używa oficjalnego mechanizmu Supabase SSR (np. `@supabase/ssr` lub równoważnego helpera)

Zmiany w `src/middleware/index.ts`:
- zamiast stałego `supabaseClient` tworzymy per-request “server client”
- ustawiamy:
  - `context.locals.supabase`
  - `context.locals.user` (opcjonalnie) — wynik `supabase.auth.getUser()`
- w zależności od ścieżki wykonujemy guard (poniżej)

### 3.2. Guard dostępu (US-036) — routing i API

#### Reguły
- Public: `/` oraz `/auth/*` bez wymogu sesji
- Private pages: `/app/*` wymaga sesji
- Private API: `/api/*` wymaga sesji **z wyjątkiem**:
  - `/api/auth/*`

#### Zachowanie
- dla requestów HTML do `/app/*`:
  - brak sesji → redirect 302 do `/auth/login?redirectTo=<ścieżka+query>`
- dla requestów do `/api/*`:
  - brak sesji → `401` z `ApiResponseDto` (tak, by React ustawił `authRequired` i przekierował usera)

To umożliwia jednocześnie:
- poprawne działanie istniejących hooków (`authRequired`),
- szybsze UX (mniej “flashowania” zawartości, bo SSR od razu redirectuje).

### 3.3. Kontrakty i przepływy Supabase Auth

#### Login (email + password)
- serwer (API route) wykonuje:
  - `supabase.auth.signInWithPassword({ email, password })`
  - po sukcesie: cookies sesji ustawione przez server client
- client (React) po sukcesie:
  - redirect do `redirectTo` lub `/app/dashboard`

#### Register (email + password)
Wymóg: auto-login po rejestracji.
- `supabase.auth.signUp({ email, password })`
- Wymaganie konfiguracyjne Supabase:


#### Logout
- `supabase.auth.signOut()`
- czyszczenie cookies
- redirect do `/`

#### Password recovery
Flow zgodny z Supabase:
1) `POST /api/auth/forgot-password`:
   - `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
   - `redirectTo` powinno wskazywać na stronę callback w tej samej domenie, np.:
     - `${origin}/auth/callback?next=/auth/reset-password`
2) `GET /auth/callback`:
   - odczytuje `code` i `next`
   - wymienia `code` na sesję (recovery session) i ustawia cookies
   - redirect do `next` (po walidacji)
3) `POST /api/auth/reset-password`:
   - `supabase.auth.updateUser({ password })` (działa, gdy jest aktywna sesja)

### 3.4. Ochrona danych (US-036) — model i polityki

#### Powiązanie danych z użytkownikiem
W bazie `plant_card.user_id` już istnieje i jest przewidziane jako powiązanie do `auth.users.id` (Supabase).
Docelowo:
- `user_id` = `auth.uid()` aktualnego usera
- nie ma potrzeby tworzenia osobnej tabeli profilu na potrzeby US-036/037.

#### RLS (Row Level Security) — wymagane
Żeby “nikt nie miał dostępu do moich roślin”, potrzebujemy RLS w Supabase:

**Tabela `plant_card`**
- SELECT/UPDATE/DELETE: `user_id = auth.uid()`
- INSERT: `user_id = auth.uid()` (lub allow insert tylko z ustawionym `user_id`)

**Tabele zależne (`disease_entry`, `seasonal_schedule`, `care_log`)**
Polityki powinny wymuszać, że rekordy są dostępne tylko jeśli ich `plant_card_id` należy do plant_card usera:
- SELECT/UPDATE/DELETE/INSERT: via `exists (select 1 from plant_card where plant_card.id = <child>.plant_card_id and plant_card.user_id = auth.uid())`

To zabezpiecza również przypadki, gdy endpointy zapomną sprawdzić `userId`.

#### Defense in depth w kodzie (zalecane)
Poza RLS, warto utrzymać “jawne” sprawdzanie ownership w serwisach:
- wszędzie gdzie istnieje `userId` w sygnaturze serwisu, utrzymać filtr `.eq("user_id", userId)`
- w `getPlantDetail` dodać parametr `userId` i wykonać `assertPlantOwnershipOrNotFound` (jest już gotowe)

### 3.5. Kontrakty odpowiedzi i kody błędów (auth)
Stosujemy istniejący envelope `ApiResponseDto<T>`.

Proponowane kody błędów (pole `error.code`):
- `validation_error` (400)
- `invalid_json` (400)
- `unauthorized` (401)
- `forbidden` (403) — zwykle mapowane do 404 przy zasobach roślin
- `email_already_in_use` (409)
- `invalid_credentials` (401)
- `rate_limited` (429)
- `server_error` (500)

Minimalna zasada UX: komunikaty nie mogą ujawniać wrażliwych informacji (np. czy konto istnieje).

---

## Checklist zgodności z PRD (US-036 / US-037)
- Dedykowane strony logowania i rejestracji: **tak** (`/auth/login`, `/auth/register`)
- Logowanie: e-mail + hasło: **tak**
- Rejestracja: e-mail + hasło + potwierdzenie: **tak**
- Zakaz providerów zewnętrznych (Google itd.): **tak**
- Przycisk logowania (prawy górny róg): **tak** (w `Layout.astro` / public)
- Przycisk wylogowania w `AppLayout.astro` (prawy górny róg): **tak**
- Brak dostępu do `/app/*` bez loginu: **tak** (middleware + 401 z API)
- Ochrona przed dostępem do cudzych danych: **tak** (RLS + ownership checks)
- US-005 (zmiana hasła z podaniem aktualnego hasła): **tak** (plan: `/app/profile` + `/api/auth/change-password`)

