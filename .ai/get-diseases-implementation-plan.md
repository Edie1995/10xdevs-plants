# API Endpoint Implementation Plan: GET /api/plants/:id/diseases

## 1. Przegląd punktu końcowego
Endpoint zwraca listę wpisów chorób przypisanych do konkretnej karty rośliny. Dane mają pochodzić z tabeli `disease_entry` i być ograniczone do rośliny należącej do zalogowanego użytkownika.

## 2. Szczegóły żądania
- Metoda HTTP: `GET`
- Struktura URL: `/api/plants/:id/diseases`
- Parametry:
  - Wymagane: `id` (UUID karty rośliny, segment ścieżki)
  - Opcjonalne: brak
- Request Body: brak

## 3. Wykorzystywane typy
- `DiseaseEntryRow` (bazowy typ rekordu z tabeli `disease_entry`)
- `DiseaseDto` (publiczny DTO choroby; bez `plant_card_id`)
- `ApiResponseDto<DiseaseDto[]>`
- Potencjalny pomocniczy typ odpowiedzi: `Pick<DiseaseDto, "id" | "name" | "symptoms" | "advice" | "created_at">[]` jeśli należy trzymać się ściśle specyfikacji

## 4. Szczegóły odpowiedzi
- Status `200`: lista wpisów chorób
  - Struktura danych: tablica obiektów `(id, name, symptoms, advice, created_at)`
  - Opakowanie: standardowy `ApiResponseDto`
- Statusy błędów:
  - `400` dla niepoprawnego `id`
  - `401` dla braku autoryzacji
  - `404` gdy karta rośliny nie istnieje lub nie należy do użytkownika
  - `500` przy błędach serwera lub bazy danych

## 5. Przepływ danych
1. API route `/src/pages/api/plants/[id]/diseases.ts` (lub analogiczny plik zgodnie z konwencją).
2. Pobranie `supabase` z `context.locals` (zgodnie z regułami backend).
3. Walidacja `id` (UUID) przez Zod.
4. Autoryzacja użytkownika (np. `supabase.auth.getUser()`).
5. Weryfikacja dostępu do `plant_card`:
   - zapytanie do `plant_card` po `id` i `user_id`
   - brak rekordu => `404`
6. Pobranie wpisów chorób z `disease_entry` po `plant_card_id`.
7. Mapowanie pól na odpowiedź zgodnie ze specyfikacją.
8. Zwrócenie `ApiResponseDto` z `success: true` i tablicą wpisów.

## 6. Względy bezpieczeństwa
- Wymagana autentykacja użytkownika (token sesji Supabase).
- Autoryzacja per zasób: `plant_card.user_id` musi odpowiadać użytkownikowi z sesji.
- Walidacja wejścia (UUID), brak akceptacji dodatkowych parametrów.
- Brak bezpośredniego ujawniania `plant_card_id` w DTO.
- Użycie `context.locals.supabase` zamiast klienta globalnego.

## 7. Obsługa błędów
- `400 Bad Request`: `id` nie jest poprawnym UUID.
- `401 Unauthorized`: brak zalogowanego użytkownika lub nieważny token.
- `404 Not Found`: brak `plant_card` dla `id` lub brak uprawnień.
- `500 Internal Server Error`: błędy zapytań Supabase lub nieoczekiwane wyjątki.
- Logowanie błędów: brak dedykowanej tabeli błędów w schemacie, więc ograniczyć się do logowania serwerowego (np. `console.error`) i spójnego `ApiErrorDto`.

## 8. Wydajność
- Zapytanie do `disease_entry` filtrowane po indeksowanym kluczu obcym `plant_card_id`.
- Możliwość dodania limitu/paginacji w przyszłości, jeśli liczba wpisów będzie duża.
- Unikanie zbędnych pól w `select` (tylko wymagane kolumny).

## 9. Kroki implementacji
1. Utworzyć plik endpointu `src/pages/api/plants/[id]/diseases.ts` z `export const prerender = false`.
2. Zdefiniować schemat Zod dla `params.id` (UUID) i walidować na wejściu.
3. Pobrać `supabase` z `context.locals` oraz zweryfikować użytkownika.
4. Sprawdzić istnienie `plant_card` oraz zgodność `user_id`.
5. Pobrać dane z `disease_entry` (select tylko: `id, name, symptoms, advice, created_at`).
6. Zmapować wynik do tablicy DTO i zwrócić `ApiResponseDto` z `200`.
7. Ujednolicić obsługę błędów i komunikaty `ApiErrorDto`.
8. (Opcjonalnie) Dodać testy integracyjne dla `GET /api/plants/:id/diseases`.
