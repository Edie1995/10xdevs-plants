# Diagram autentykacji (Supabase Auth + Astro + React)

<authentication_analysis>
## 1) Przepływy autentykacji (z PRD i auth-spec)

- Public (landing):
  - wejście na public bez sesji → render landingu
  - wejście na public z sesją → redirect do aplikacji
- Auth pages:
  - wejście na strony auth bez sesji → render formularzy
  - wejście na strony auth z sesją → redirect do aplikacji
- Private pages (app):
  - wejście na stronę prywatną bez sesji → redirect do logowania z `redirectTo`
  - wejście na stronę prywatną z sesją → render strony
- Private API (data):
  - wywołanie API bez sesji → 401 (JSON), UI ustawia `authRequired` i robi redirect
  - wywołanie API z sesją → 200 + dane (ochrona: RLS + własność)
- Logowanie (e-mail + hasło):
  - React wysyła `POST` do API auth, serwer wywołuje Supabase Auth i ustawia cookies
  - po sukcesie: redirect do `redirectTo` lub do dashboardu
- Rejestracja (e-mail + hasło + potwierdzenie):
  - `POST` do API auth, Supabase `signUp`, docelowo auto-login (cookies)
  - uwaga konfiguracyjna: potwierdzenie e-mail w Supabase wpływa na auto-login
- Wylogowanie:
  - `POST` do API auth, Supabase `signOut`, czyszczenie cookies, redirect na public
- Odzyskiwanie hasła:
  - `POST` do API auth → Supabase wysyła e-mail z linkiem
  - wejście w link (callback) → wymiana `code` na sesję recovery + cookies
  - ustawienie nowego hasła → Supabase `updateUser`
- Zmiana hasła (w aplikacji):
  - `POST` do API auth, weryfikacja aktualnego hasła + ustawienie nowego
- Odświeżanie tokenu i wygaśnięcie:
  - middleware/server client weryfikuje sesję z cookies
  - gdy access token wygasł, a refresh token jest poprawny → odświeżenie + nowe cookies
  - gdy brak sesji lub refresh nieudany → redirect (HTML) lub 401 (API)

## 2) Aktorzy i interakcje

- Przeglądarka:
  - nawigacja po stronach Astro
  - formularze React (auth) + fetch do API z cookies
  - reakcja na 401: ustawienie `authRequired` i przekierowanie na logowanie
- Middleware:
  - tworzenie server client Supabase per request na bazie cookies
  - egzekwowanie reguł dostępu: public / auth / app / api
  - odświeżanie tokenów i zapis zmian do cookies
- Astro API:
  - endpointy auth (login/register/logout/forgot/reset/change)
  - endpointy danych (dashboard, plants, itd.) wymagające sesji
- Supabase Auth:
  - wydawanie i weryfikacja sesji, rotacja refresh tokenów, recovery flow

## 3) Procesy weryfikacji i odświeżania tokenów

- Weryfikacja:
  - middleware tworzy server client z cookies i pobiera usera/sesję
  - brak usera → traktowane jako brak sesji (redirect/401 zależnie od typu żądania)
- Odświeżanie:
  - gdy access token jest nieważny, server client używa refresh tokena
  - po sukcesie zapisuje nowe cookies w odpowiedzi
  - po porażce czyści stan i wymusza ponowne logowanie

## 4) Krótki opis kroków (wspólny szkielet)

- Krok wejściowy: request strony lub API z cookies (jeśli istnieją)
- Middleware: tworzy Supabase server client, weryfikuje sesję i stosuje guard
- API auth (login/register): wywołuje Supabase Auth i ustawia cookies
- UI: po sukcesie nawigacja, po 401 redirect do logowania z bezpiecznym `redirectTo`
</authentication_analysis>

<mermaid_diagram>
```mermaid
sequenceDiagram
autonumber

participant Browser as Przeglądarka
participant Middleware as Middleware
participant API as Astro API
participant Auth as Supabase Auth

Note over Browser,Middleware: Sesja działa przez cookies (fetch ma include)

%% === Public / landing ===
Browser->>Middleware: Żądanie strony publicznej
activate Middleware
Middleware->>Auth: Odczyt sesji z cookies
activate Auth
Auth-->>Middleware: Sesja lub brak sesji
deactivate Auth
alt Użytkownik zalogowany
  Middleware-->>Browser: Redirect do aplikacji
else Użytkownik niezalogowany
  Middleware-->>Browser: Render landingu
end
deactivate Middleware

%% === Strona prywatna (app) ===
Browser->>Middleware: Żądanie strony prywatnej
activate Middleware
Middleware->>Auth: Weryfikacja sesji i usera
activate Auth
alt Sesja ważna
  Auth-->>Middleware: User + access token
  deactivate Auth
  Middleware-->>Browser: Render strony aplikacji
else Token wygasł, refresh możliwy
  Auth-->>Middleware: Odświeżenie sesji
  deactivate Auth
  Middleware-->>Browser: Nowe cookies + render strony
else Brak sesji lub refresh nieudany
  Auth-->>Middleware: Brak usera
  deactivate Auth
  Middleware-->>Browser: Redirect do logowania z redirectTo
end
deactivate Middleware

%% === API danych (app) ===
Browser->>Middleware: Żądanie API danych
activate Middleware
Middleware->>Auth: Weryfikacja sesji
activate Auth
alt Brak sesji
  Auth-->>Middleware: Brak usera
  deactivate Auth
  Middleware-->>Browser: 401 (JSON)
  Note over Browser: UI ustawia authRequired i robi redirect
else Sesja ważna
  Auth-->>Middleware: User
  deactivate Auth
  Middleware->>API: Przekazanie requestu (locals.supabase)
  activate API
  API-->>Browser: 200 + dane (RLS izoluje rekordy)
  deactivate API
end
deactivate Middleware

%% === Logowanie ===
Browser->>API: Formularz logowania (dane)
activate API
Note over API: Walidacja danych i redirectTo (tylko ścieżki względne)
API->>Auth: Logowanie e-mail/hasło
activate Auth
Auth-->>API: Sesja + tokeny
deactivate Auth
API-->>Browser: 200 + ustaw cookies sesji
deactivate API
Browser-->>Browser: Redirect do redirectTo lub dashboardu

%% === Rejestracja (auto-login) ===
Browser->>API: Formularz rejestracji (dane)
activate API
API->>Auth: Rejestracja e-mail/hasło
activate Auth
alt Rejestracja tworzy sesję
  Auth-->>API: Sesja + tokeny
  API-->>Browser: 200 + ustaw cookies sesji
  Browser-->>Browser: Redirect do aplikacji
else Wymagana weryfikacja e-mail
  Auth-->>API: Konto utworzone bez sesji
  API-->>Browser: 200 + komunikat "sprawdź e-mail"
end
deactivate Auth
deactivate API

%% === Wylogowanie ===
Browser->>API: Żądanie wylogowania
activate API
API->>Auth: Wylogowanie (unieważnij sesję)
activate Auth
Auth-->>API: OK
deactivate Auth
API-->>Browser: Wyczyść cookies + redirect na public
deactivate API

%% === Odzyskiwanie hasła (recovery) ===
Browser->>API: Żądanie wysyłki linku resetu
activate API
API->>Auth: Wyślij e-mail recovery
activate Auth
Auth-->>API: OK
deactivate Auth
API-->>Browser: 200 + komunikat neutralny
deactivate API

Browser->>Middleware: Wejście z linku (code)
activate Middleware
Middleware->>Auth: Wymień code na sesję recovery
activate Auth
Auth-->>Middleware: Sesja recovery + tokeny
deactivate Auth
Middleware-->>Browser: Ustaw cookies + redirect do resetu hasła
deactivate Middleware

Browser->>API: Ustaw nowe hasło (recovery)
activate API
API->>Auth: Zmień hasło w aktywnej sesji
activate Auth
Auth-->>API: OK
deactivate Auth
API-->>Browser: 200 + redirect do aplikacji
deactivate API

%% === Zmiana hasła (w aplikacji) ===
Browser->>API: Zmień hasło (aktualne + nowe)
activate API
API->>Auth: Weryfikacja aktualnego hasła
activate Auth
Auth-->>API: OK lub błąd
alt Aktualne hasło poprawne
  API->>Auth: Ustaw nowe hasło
  Auth-->>API: OK
  API-->>Browser: 200 + toast sukcesu
else Aktualne hasło błędne
  API-->>Browser: 401 + komunikat ogólny
end
deactivate Auth
deactivate API
```
</mermaid_diagram>

