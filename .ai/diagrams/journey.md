# Diagram podróży użytkownika — logowanie i rejestracja

<user_journey_analysis>
## 1) Ścieżki użytkownika (z PRD + auth-spec)

- Korzystanie jako **niezalogowany**:
  - wejście na landing page
  - próba wejścia do aplikacji (np. dashboard / kolekcja roślin) → przekierowanie do logowania
- **Logowanie** (e-mail + hasło):
  - logowanie z landingu
  - logowanie po przekierowaniu z chronionej podstrony (powrót do miejsca, z którego user przyszedł)
  - błąd logowania → komunikat
- **Rejestracja** (e-mail + hasło + potwierdzenie hasła):
  - poprawna rejestracja → dostęp do aplikacji
  - (wariant) wymagane potwierdzenie e-mail → user weryfikuje adres i dopiero wtedy uzyskuje dostęp
  - błąd rejestracji (np. konto istnieje, walidacja) → komunikat
- **Odzyskiwanie hasła**:
  - wysłanie linku resetu (komunikat neutralny)
  - wejście z linku i ustawienie nowego hasła
  - brak/nieaktualny link → ponowne wysłanie
- **Zmiana hasła** (w aplikacji, z podaniem aktualnego hasła)
- **Wylogowanie** (z headera aplikacji)

## 2) Główne podróże i stany

- Public:
  - Landing (CTA do logowania/rejestracji)
  - Strony autentykacji (logowanie / rejestracja / odzyskiwanie / reset)
- Private:
  - Aplikacja (dashboard, lista roślin, szczegóły rośliny, profil)
  - Sesja wygasła (powrót do logowania)

## 3) Punkty decyzyjne i alternatywne ścieżki

- Czy użytkownik ma aktywną sesję?
  - tak → automatyczne przejście do aplikacji
  - nie → landing lub strony auth (zależnie od wejścia)
- Czy dane formularza są poprawne?
  - tak → przejście dalej
  - nie → komunikaty i poprawki w formularzu
- Czy po rejestracji wymagane jest potwierdzenie e-mail?
  - tak → stan “Sprawdź e-mail” + przejście po weryfikacji
  - nie → bezpośredni dostęp do aplikacji
- Czy link resetu hasła jest ważny?
  - tak → ustaw nowe hasło
  - nie → poproś o wysłanie linku ponownie

## 4) Krótki opis celu każdego stanu (high-level)

- Landing: wyjaśnia wartość aplikacji i prowadzi do logowania/rejestracji.
- Formularz logowania: umożliwia powrót do aplikacji (lub do miejsca, które user próbował otworzyć).
- Formularz rejestracji: pozwala utworzyć konto do prywatnej aplikacji.
- Sprawdź e-mail: instruuje użytkownika, by potwierdził adres (jeśli wymagane).
- Formularz odzyskiwania: pozwala poprosić o link resetu hasła.
- Formularz resetu: pozwala ustawić nowe hasło.
- Aplikacja: prywatna część z dashboardem i kolekcją roślin.
- Profil: umożliwia zmianę hasła.
- Wylogowano: kończy sesję i przenosi na publiczny landing.
</user_journey_analysis>

<mermaid_diagram>

```mermaid
stateDiagram-v2
  [*] --> Wejscie

  state "Wejście do serwisu" as Wejscie {
    [*] --> WejscieDecyzja
    state WejscieDecyzja <<choice>>

    WejscieDecyzja --> Landing: Brak sesji
    WejscieDecyzja --> Aplikacja: Aktywna sesja
  }

  Landing: Widok publiczny z CTA
  note right of Landing
    Niezalogowany użytkownik widzi landing page.
    Może przejść do logowania lub rejestracji.
  end note

  state "Autentykacja" as Autentykacja {
    [*] --> WidokLogowania

    state "Logowanie" as Logowanie {
      [*] --> WidokLogowania
      WidokLogowania: Formularz e-mail + hasło
      state if_logowanie <<choice>>

      WidokLogowania --> if_logowanie: Klik "Zaloguj"
      if_logowanie --> Zalogowano: Dane poprawne
      if_logowanie --> BladLogowania: Dane błędne
      BladLogowania --> WidokLogowania: Popraw dane
    }

    state "Rejestracja" as Rejestracja {
      [*] --> WidokRejestracji
      WidokRejestracji: Formularz e-mail + hasło + potwierdzenie
      state if_rejestracja <<choice>>

      WidokRejestracji --> if_rejestracja: Klik "Załóż konto"
      if_rejestracja --> BladRejestracji: Dane błędne / konto istnieje
      BladRejestracji --> WidokRejestracji: Popraw dane

      if_rejestracja --> PoRejestracji: Rejestracja OK
      state "Po rejestracji" as PoRejestracji {
        [*] --> if_weryfikacja_email
        state if_weryfikacja_email <<choice>>
        if_weryfikacja_email --> SprawdzEmail: Wymagana weryfikacja
        if_weryfikacja_email --> Zalogowano: Auto-dostęp
      }

      SprawdzEmail: Sprawdź skrzynkę i potwierdź e-mail
      note right of SprawdzEmail
        Użytkownik potwierdza adres e-mail,
        aby móc korzystać z aplikacji.
      end note

      SprawdzEmail --> PoWeryfikacjiEmail: Klik w link w e-mailu
      PoWeryfikacjiEmail --> WidokLogowania: Przejdź do logowania
    }

    state "Odzyskiwanie hasła" as OdzyskiwanieHasla {
      [*] --> WidokOdzyskiwania
      WidokOdzyskiwania: Podaj e-mail
      WidokOdzyskiwania --> PotwierdzenieWysylki: Klik "Wyślij link"
      PotwierdzenieWysylki: Komunikat neutralny
      PotwierdzenieWysylki --> [*]
    }

    state "Reset hasła" as ResetHasla {
      [*] --> WejscieZLinku
      state if_link <<choice>>
      WejscieZLinku --> if_link
      if_link --> WidokResetu: Link ważny
      if_link --> LinkNiewazny: Link nieważny

      WidokResetu: Ustaw nowe hasło + potwierdzenie
      WidokResetu --> Zalogowano: Hasło ustawione
      LinkNiewazny --> WidokOdzyskiwania: Wyślij link ponownie
    }
  }

  state "Aplikacja (tylko po zalogowaniu)" as Aplikacja {
    [*] --> Dashboard
    Dashboard --> ListaRoslin: Przejdź do kolekcji
    ListaRoslin --> SzczegolyRosliny: Otwórz kartę rośliny
    ListaRoslin --> DodajRosline: Dodaj nową roślinę
    DodajRosline --> ListaRoslin: Zapisano / anulowano
    SzczegolyRosliny --> ListaRoslin: Wróć do listy

    state "Profil" as Profil {
      [*] --> WidokProfilu
      WidokProfilu --> ZmianaHasla: Edytuj hasło
      state if_zmiana_hasla <<choice>>
      ZmianaHasla --> if_zmiana_hasla: Klik "Zapisz"
      if_zmiana_hasla --> WidokProfilu: Zmieniono hasło
      if_zmiana_hasla --> ZmianaHasla: Błąd / popraw dane
    }

    state "Sesja" as Sesja {
      [*] --> Aktywna
      state if_sesja <<choice>>
      Aktywna --> if_sesja: Używanie aplikacji
      if_sesja --> Aktywna: Sesja ważna
      if_sesja --> SesjaWygasla: Sesja wygasła
    }

    SesjaWygasla --> WidokLogowania: Zaloguj ponownie
  }

  state Zalogowano
  Zalogowano --> Aplikacja: Wejście do aplikacji
  note right of Zalogowano
    Po logowaniu użytkownik trafia na dashboard
    albo wraca do miejsca, które próbował otworzyć.
  end note

  Landing --> WidokLogowania: Klik "Zaloguj się"
  Landing --> WidokRejestracji: Klik "Załóż konto"

  WidokLogowania --> WidokOdzyskiwania: Klik "Nie pamiętam hasła"
  WidokLogowania --> WidokRejestracji: Klik "Załóż konto"
  WidokRejestracji --> WidokLogowania: Mam konto

  state "Wylogowanie" as Wylogowanie {
    [*] --> PotwierdzenieWylogowania
    PotwierdzenieWylogowania --> Wylogowano: Klik "Wyloguj"
    Wylogowano --> Landing
  }

  Aplikacja --> Wylogowanie: Klik "Wyloguj"

  state "Próba wejścia bez logowania" as ProbaWejsciaBezLogowania {
    [*] --> WejscieNaPrywatnaStrone
    WejscieNaPrywatnaStrone --> WidokLogowania: Brak sesji
  }

  Landing --> ProbaWejsciaBezLogowania: Otwórz chronioną stronę

  Aplikacja --> [*]: Zamknij aplikację
```

</mermaid_diagram>
