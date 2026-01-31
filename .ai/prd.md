# Dokument wymagań produktu (PRD) - Greenie
## 1. Przegląd produktu
Greenie to webowa aplikacja typu utility do prywatnego zarządzania pielęgnacją roślin domowych i ogrodowych. 
Produkt jest dostępny wyłącznie po zalogowaniu i działa online jako responsywna aplikacja webowa. 
Użytkownik buduje własną bazę roślin od zera, zapisuje instrukcje pielęgnacji, prowadzi dziennik działań oraz otrzymuje informację o zbliżających się terminach podlewania i nawożenia. 
W MVP nie ma funkcji społecznościowych, udostępniania treści, aplikacji mobilnej ani zaawansowanych multimediów. 
Identyfikacja roślin odbywa się poprzez wybór ikony i koloru.

## 2. Problem użytkownika
Użytkownicy mają trudność w utrzymaniu roślin w dobrej kondycji z powodu braku łatwego dostępu do uporządkowanych instrukcji pielęgnacji, trudności w śledzeniu historii działań oraz braku prostego systemu przypomnień opartych na realnych datach wykonania. 
Greenie rozwiązuje ten problem poprzez prywatny, uporządkowany rejestr roślin oraz logikę harmonogramu zależną od sezonu i faktycznych działań użytkownika.

## 3. Wymagania funkcjonalne
1. Uwierzytelnianie i dostęp
   1.1. Rejestracja konta przez e-mail i hasło.
   1.2. Logowanie przez e-mail i hasło.
   1.4. Odzyskiwanie hasła.
   1.5. Zmiana hasła.
   1.6. Dostęp do aplikacji wyłącznie po zalogowaniu; niezalogowani widzą landing page.

2. Karty roślin (CRUD)
   2.1. Tworzenie, przeglądanie, edycja i usuwanie kart roślin.
   2.2. Pola karty rośliny:
       - Nazwa: tekst, max 50 znaków.
       - Podłoże: tekst.
       - Doniczka: tekst.
       - Stanowisko: wybór z listy.
       - Trudność: enum Łatwa, Średnia, Trudna.
       - Instrukcje: Podlewanie, Przesadzanie, Rozmnażanie, Uwagi, max 2000 znaków każde.
       - Choroby: lista akordeonowa, pola: Nazwa, Objawy, Rady.
       - Identyfikacja: wybór ikony + kolor tła/ramki.
   2.3. Walidacja pól liczbowych tylko cyfry.
   2.4. Format daty prezentacji: DD.MM.RRRR.

3. Harmonogram pielęgnacji
   3.1. Definiowanie częstotliwości podlewania i nawożenia osobno dla pór roku.
   3.2. Możliwość wyłączenia nawożenia w sezonie poprzez ustawienie wartości 0.
   3.3. Terminy kolejnych czynności liczone od faktycznej daty wykonania.
   3.4. Możliwość oznaczenia wykonania czynności z datą wsteczną przez modal.
   3.5. Zmiana interwału po zmianie pory roku obowiązuje od pierwszej czynności w nowym sezonie.

4. Dashboard i lista roślin
   4.1. Sekcje: Wymagają uwagi oraz Wszystkie moje rośliny.
   4.2. Sortowanie: pilność, następnie alfabetycznie.
   4.3. Oznaczenia statusu: czerwony dla przeterminowanych, pomarańczowy dla dzisiejszych.
   4.4. Paginacja listy, max 20 elementów na stronę.
   4.5. Wyszukiwarka tekstowa w obrębie prywatnej kolekcji.

5. UX i komunikaty
   5.1. Empty state z komunikatem i CTA Dodaj roślinę.
   5.2. Toasty sukcesu i błędu widoczne 3 sekundy.
   5.3. Modal potwierdzenia przy usuwaniu rośliny.
   5.4. Menu mobilne na karcie rośliny jako ikona z opcjami.
   5.5. Stopka z dokumentami prawnymi.

## 4. Granice produktu
1. Brak publicznej bazy wiedzy i treści współdzielonych między użytkownikami.
2. Brak trybu gościa i dostępu bez logowania.
3. Brak edycji istniejących notatek w zewnętrznej bazie wiedzy.
4. Brak powiadomień push i e-mail dotyczących podlewania i nawożenia.
5. Brak funkcji społecznościowych i współdzielenia tablic.
6. Brak aplikacji mobilnej.
7. Brak zaawansowanej obsługi multimediów i uploadu zdjęć roślin.
8. Brak seedowanych roślin lub gotowych list startowych.

## 5. Historyjki użytkowników
1. US-001
   Tytuł: Rejestracja konta przez e-mail
   Opis: Jako nowy użytkownik chcę założyć konto przez e-mail i hasło, aby korzystać z aplikacji.
   Kryteria akceptacji:
   - Formularz rejestracji wymaga e-maila i hasła.
   - System waliduje poprawność e-maila i minimalne wymagania hasła.
   - Po poprawnej rejestracji użytkownik musi potwierdzić email zeby się zalogować.
   - W przypadku błędu użytkownik widzi komunikat toast.

2. US-002
   Tytuł: Logowanie przez e-mail i hasło
   Opis: Jako zarejestrowany użytkownik chcę zalogować się, aby uzyskać dostęp do mojego ogrodu.
   Kryteria akceptacji:
   - Użytkownik podaje e-mail i hasło.
   - Po poprawnym logowaniu widzi dashboard.
   - Błędne dane skutkują komunikatem toast.

4. US-004
   Tytuł: Odzyskiwanie hasła
   Opis: Jako użytkownik, który zapomniał hasła, chcę je odzyskać, aby wrócić do aplikacji.
   Kryteria akceptacji:
   - Dostępny jest formularz odzyskiwania hasła.
   - Po podaniu poprawnego e-maila system potwierdza wysłanie instrukcji.
   - Dla błędnego e-maila wyświetla się komunikat toast.

5. US-005
   Tytuł: Zmiana hasła
   Opis: Jako użytkownik chcę edytować profil, aby zaktualizować dane.
   Kryteria akceptacji:
   - Użytkownik może zmienić hasło.
   - Zmiana wymaga podania aktualnego hasła.
   - Po zapisie pojawia się toast sukcesu.

6. US-006
   Tytuł: Ograniczenie dostępu do treści
   Opis: Jako właściciel produktu chcę, aby treści były dostępne tylko po zalogowaniu, aby chronić dane.
   Kryteria akceptacji:
   - Niezalogowany użytkownik nie widzi dashboardu ani kart roślin.
   - Niezalogowany użytkownik widzi landing page.
   - Bezpośrednie wejście na prywatny URL przekierowuje do logowania.

7. US-007
   Tytuł: Empty state na dashboardzie
   Opis: Jako nowy użytkownik chcę widzieć komunikat o pustym ogrodzie, aby wiedzieć, co zrobić.
   Kryteria akceptacji:
   - Gdy brak roślin, widoczny jest komunikat Twój ogród jest pusty.
   - Dostępny jest przycisk Dodaj roślinę.
   - Kliknięcie CTA otwiera formularz dodawania rośliny.

8. US-008
   Tytuł: Dodanie nowej karty rośliny
   Opis: Jako użytkownik chcę dodać kartę rośliny z pełnymi danymi, aby zarządzać pielęgnacją.
   Kryteria akceptacji:
   - Formularz zawiera wszystkie pola zdefiniowane w wymaganiach.
   - Nazwa ma limit 50 znaków.
   - Instrukcje mają limit 2000 znaków.
   - Po zapisie pojawia się toast sukcesu i roślina jest widoczna na liście.

9. US-009
   Tytuł: Dodanie rośliny z minimalnymi danymi
   Opis: Jako użytkownik chcę móc zapisać roślinę, nawet jeśli nie uzupełnię wszystkich pól tekstowych.
   Kryteria akceptacji:
   - Wymagane są tylko pola obowiązkowe zdefiniowane przez produkt.
   - Brak uzupełnienia pól opcjonalnych nie blokuje zapisu.
   - Zapisana karta wyświetla puste pola w sposób neutralny.

10. US-010
   Tytuł: Walidacja pól liczbowych
   Opis: Jako użytkownik chcę, aby pola liczbowe akceptowały tylko cyfry, aby uniknąć błędów.
   Kryteria akceptacji:
   - Pola liczbowe blokują znaki inne niż cyfry.
   - Próba wklejenia nieprawidłowej wartości jest odrzucana.
   - Błąd walidacji pokazuje toast.

11. US-011
   Tytuł: Wybór ikony i koloru rośliny
   Opis: Jako użytkownik chcę wybrać ikonę i kolor, aby łatwo odróżniać rośliny.
   Kryteria akceptacji:
   - W formularzu dostępny jest wybór ikony i koloru.
   - Wybrany zestaw jest widoczny na liście roślin.
   - Brak wyboru jest obsłużony wartością domyślną.

12. US-012
   Tytuł: Dodanie choroby do karty rośliny
   Opis: Jako użytkownik chcę dodać chorobę z objawami i radami, aby mieć kompletne informacje.
   Kryteria akceptacji:
   - Użytkownik może dodać wiele pozycji chorób.
   - Każda pozycja ma pola Nazwa, Objawy, Rady.
   - Po zapisaniu choroby są widoczne w akordeonie.

13. US-013
   Tytuł: Usuwanie choroby z karty
   Opis: Jako użytkownik chcę usunąć chorobę z listy, gdy nie jest już aktualna.
   Kryteria akceptacji:
   - Użytkownik może usunąć wybraną pozycję choroby.
   - Usunięcie jest widoczne po zapisie karty.

14. US-014
   Tytuł: Edycja karty rośliny
   Opis: Jako użytkownik chcę edytować kartę, aby aktualizować informacje.
   Kryteria akceptacji:
   - Edycja pozwala zmienić wszystkie pola karty.
   - Zmiany są zapisywane po zatwierdzeniu.
   - Po zapisie pojawia się toast sukcesu.

15. US-015
   Tytuł: Anulowanie edycji karty
   Opis: Jako użytkownik chcę anulować edycję, aby nie wprowadzać niechcianych zmian.
   Kryteria akceptacji:
   - Użytkownik może anulować edycję bez zapisu.
   - Dane pozostają bez zmian po anulowaniu.

16. US-016
   Tytuł: Usunięcie karty rośliny
   Opis: Jako użytkownik chcę usunąć kartę rośliny, aby porządkować ogród.
   Kryteria akceptacji:
   - Usunięcie wymaga potwierdzenia w modalu.
   - Po potwierdzeniu roślina znika z listy.
   - Wyświetlany jest toast sukcesu.

17. US-017
   Tytuł: Anulowanie usuwania karty
   Opis: Jako użytkownik chcę anulować usuwanie, aby uniknąć przypadkowej utraty danych.
   Kryteria akceptacji:
   - Modal potwierdzenia ma opcję anuluj.
   - Anulowanie nie zmienia danych.

18. US-018
   Tytuł: Przeglądanie listy roślin
   Opis: Jako użytkownik chcę widzieć listę wszystkich roślin, aby mieć pełny wgląd w ogród.
   Kryteria akceptacji:
   - Lista zawiera wszystkie zapisane rośliny.
   - Element listy pokazuje nazwę, ikonę i kolor.
   - Lista jest podzielona na sekcje wymagane przez produkt.

19. US-019
   Tytuł: Sortowanie listy według pilności i nazwy
   Opis: Jako użytkownik chcę, aby lista była posortowana wg pilności i alfabetycznie, aby szybko znaleźć priorytety.
   Kryteria akceptacji:
   - Rośliny pilne są wyświetlane przed pozostałymi.
   - W ramach tego samego poziomu pilności lista jest alfabetyczna.

20. US-020
   Tytuł: Oznaczenia kolorystyczne terminów
   Opis: Jako użytkownik chcę widzieć kolory statusu, aby szybko rozpoznać pilność.
   Kryteria akceptacji:
   - Przeterminowane terminy są oznaczone na czerwono.
   - Terminy na dziś są oznaczone na pomarańczowo.
   - Terminy przyszłe nie są oznaczone tymi kolorami.

21. US-021
   Tytuł: Wyszukiwanie roślin po nazwie
   Opis: Jako użytkownik chcę wyszukać roślinę po nazwie, aby szybko ją znaleźć.
   Kryteria akceptacji:
   - Wyszukiwarka filtruje listę w obrębie prywatnej kolekcji.
   - Brak wyników pokazuje stan pusty listy.
   - Wyszukiwanie nie obejmuje roślin innych użytkowników.

22. US-022
   Tytuł: Paginacja listy roślin
   Opis: Jako użytkownik chcę przeglądać listę stronami, aby zachować wydajność.
   Kryteria akceptacji:
   - Na stronie jest maksymalnie 20 roślin.
   - Użytkownik może przełączać strony.
   - Wyszukiwanie działa w obrębie aktualnego wyniku.

23. US-023
   Tytuł: Widok karty rośliny
   Opis: Jako użytkownik chcę otworzyć kartę rośliny, aby zobaczyć szczegóły.
   Kryteria akceptacji:
   - Widok pokazuje wszystkie pola karty.
   - Widok pokazuje harmonogram i ostatnie działania.
   - Daty są w formacie DD.MM.RRRR.

24. US-024
   Tytuł: Ustawienie częstotliwości podlewania na sezon
   Opis: Jako użytkownik chcę ustawić częstotliwość podlewania osobno dla sezonów.
   Kryteria akceptacji:
   - Użytkownik wybiera częstotliwości dla każdej pory roku.
   - Zapisane wartości są przechowywane per sezon.
   - Walidacja akceptuje tylko cyfry.

25. US-025
   Tytuł: Ustawienie częstotliwości nawożenia na sezon
   Opis: Jako użytkownik chcę ustawić częstotliwość nawożenia osobno dla sezonów.
   Kryteria akceptacji:
   - Użytkownik wybiera częstotliwości dla każdej pory roku.
   - Wartość 0 wyłącza nawożenie w danym sezonie.
   - Walidacja akceptuje tylko cyfry.

26. US-026
   Tytuł: Oznaczenie wykonania podlewania dziś
   Opis: Jako użytkownik chcę oznaczyć, że podlałem roślinę, aby zresetować licznik.
   Kryteria akceptacji:
   - Akcja ustawia datę ostatniego podlewania na dziś.
   - Kolejny termin jest przeliczany od daty wykonania.
   - Na dashboardzie status pilności jest aktualizowany.

27. US-027
   Tytuł: Oznaczenie wykonania nawożenia dziś
   Opis: Jako użytkownik chcę oznaczyć, że nawoziłem roślinę, aby zresetować licznik.
   Kryteria akceptacji:
   - Akcja ustawia datę ostatniego nawożenia na dziś.
   - Kolejny termin jest przeliczany od daty wykonania.
   - Gdy w sezonie nawożenie = 0, akcja jest niedostępna.

28. US-028
   Tytuł: Backdating podlewania
   Opis: Jako użytkownik chcę wskazać datę wsteczną podlewania, aby termin był obliczony poprawnie.
   Kryteria akceptacji:
   - Modal pozwala wybrać datę wsteczną.
   - Data wsteczna nie może być przyszła.
   - Po zapisie licznik jest liczony od daty wstecznej.

29. US-029
   Tytuł: Backdating nawożenia
   Opis: Jako użytkownik chcę wskazać datę wsteczną nawożenia, aby termin był obliczony poprawnie.
   Kryteria akceptacji:
   - Modal pozwala wybrać datę wsteczną.
   - Data wsteczna nie może być przyszła.
   - Po zapisie licznik jest liczony od daty wstecznej.

30. US-030
   Tytuł: Zmiana interwału po zmianie sezonu
   Opis: Jako użytkownik chcę, aby nowy interwał sezonowy obowiązywał po pierwszej czynności w sezonie.
   Kryteria akceptacji:
   - Zmiana sezonu nie resetuje licznika automatycznie.
   - Nowy interwał jest użyty po wykonaniu pierwszej czynności.

31. US-031
   Tytuł: Podgląd najbliższych terminów
   Opis: Jako użytkownik chcę widzieć rośliny wymagające uwagi, aby ustalić priorytety.
   Kryteria akceptacji:
   - Sekcja Wymagają uwagi pokazuje rośliny z terminem dziś lub przeterminowanym.
   - Po wykonaniu czynności roślina znika z tej sekcji.

32. US-032
   Tytuł: Menu mobilne na karcie rośliny
   Opis: Jako użytkownik mobile chcę korzystać z menu kontekstowego, aby edytować lub usuwać roślinę.
   Kryteria akceptacji:
   - Ikona menu jest widoczna na kartach w widoku mobilnym.
   - Menu zawiera opcje edycji i usunięcia.
   - Działania są dostępne bez najechania myszą.

33. US-033
   Tytuł: Obsługa błędów zapisu karty
   Opis: Jako użytkownik chcę otrzymać informację o błędzie zapisu, aby wiedzieć, co się stało.
   Kryteria akceptacji:
   - Błąd zapisu pokazuje toast o niepowodzeniu.
   - Dane w formularzu nie są tracone po błędzie.

34. US-034
   Tytuł: Wyświetlenie stopki z dokumentami prawnymi
   Opis: Jako użytkownik chcę mieć dostęp do dokumentów prawnych w stopce.
   Kryteria akceptacji:
   - Stopka jest widoczna na landing page i w aplikacji.
   - Stopka zawiera linki do dokumentów prawnych.

35. US-035
   Tytuł: Brak treści w wyszukiwarce
   Opis: Jako użytkownik chcę zobaczyć komunikat, gdy wyszukiwanie nie zwraca wyników.
   Kryteria akceptacji:
   - Lista pokazuje brak wyników dla zapytania.
   - Użytkownik może wyczyścić wyszukiwanie i wrócić do pełnej listy.

36. US-036
   Tytuł: Ochrona przed dostępem do cudzych danych
   Opis: Jako użytkownik chcę, aby nikt nie miał dostępu do moich roślin.
   Kryteria akceptacji:
   - Użytkownik widzi tylko własne karty roślin.
   - Próba dostępu do nie swojej karty jest blokowana.

37. US-037: Bezpieczny dostęp i uwierzytelnianie
- Tytuł: Bezpieczny dostęp
- Opis: Jako użytkownik chcę mieć możliwość rejestracji i logowania się do systemu w sposób zapewniający bezpieczeństwo moich danych.
- Kryteria akceptacji:
  - Logowanie i rejestracja odbywają się na dedykowanych stronach.
  - Logowanie wymaga podania adresu email i hasła.
  - Rejestracja wymaga podania adresu email, hasła i potwierdzenia hasła.
  - Użytkownik NIE MOŻE korzystać z seriwsu Kolekcji roslin i dashboardu bez logowania się do systemu (US-036).
  - Użytkownik może logować się do systemu poprzez przycisk w prawym górnym rogu.
  - Użytkownik może się wylogować z systemu poprzez przycisk w prawym górnym rogu w głównym @AppLayout.astro.
  - Nie korzystamy z zewnętrznych serwisów logowania (np. Google, GitHub).
  - Odzyskiwanie hasła powinno być możliwe.

## 6. Metryki sukcesu
1. Wskaźnik aktywacji: odsetek użytkowników, którzy dodali minimum 1 roślinę w ciągu 24 godzin od rejestracji.
2. Wskaźnik retencji: odsetek użytkowników powracających w 2. i 4. tygodniu w celu wykonania akcji Podlano.
3. Wskaźnik skuteczności harmonogramu: odsetek roślin z wykonanym zadaniem w terminie.
4. Wskaźnik wykorzystania wyszukiwarki: odsetek sesji, w których użyto wyszukiwarki.
5. Wskaźnik błędów zapisu: liczba błędów zapisu kart na 100 prób.
