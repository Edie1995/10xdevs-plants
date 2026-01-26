# API Endpoint Implementation Plan: POST /api/plants

## 1. Przegląd punktu końcowego
Endpoint tworzy nową kartę rośliny (plant_card) wraz z opcjonalnymi wpisami chorób i sezonowymi harmonogramami. Zwraca utworzony rekord wraz z zagnieżdżonymi `schedules` i `diseases`.

## 2. Szczegóły żądania
- Metoda HTTP: `POST`
- Struktura URL: `/api/plants`
- Parametry:
  - Wymagane: `name`
  - Opcjonalne: `soil`, `pot`, `position`, `difficulty`, `watering_instructions`, `repotting_instructions`, `propagation_instructions`, `notes`, `icon_key`, `color_hex`, `schedules`, `diseases`
- Request Body:
  - `name`: string (<= 50)
  - `soil`: string (<= 200)
  - `pot`: string (<= 200)
  - `position`: string (<= 50)
  - `difficulty`: "easy" | "medium" | "hard"
  - `watering_instructions`: string (<= 2000)
  - `repotting_instructions`: string (<= 2000)
  - `propagation_instructions`: string (<= 2000)
  - `notes`: string (<= 2000)
  - `icon_key`: string (<= 50)
  - `color_hex`: "#RRGGBB"
  - `schedules`: array sezonów (spring/summer/autumn/winter) z `watering_interval` i `fertilizing_interval` (0-365)
  - `diseases`: array wpisów z `name` (<= 50), `symptoms` (<= 2000), `advice` (<= 2000)

## 3. Wykorzystywane typy
- DTO:
  - `ApiResponseDto<PlantCardDetailDto>`
  - `PlantCardDetailDto`
  - `DiseaseDto`
  - `SeasonalScheduleDto`
- Command modele:
  - `PlantCardCreateCommand`
  - `DiseaseCommand`
  - `SeasonalScheduleCommand`

## 4. Szczegóły odpowiedzi
- Sukces: `201 Created`
  - `ApiResponseDto<PlantCardDetailDto>` zawierający utworzoną kartę rośliny z `schedules` i `diseases`.
- Błędy:
  - `400 Bad Request` (walidacja danych wejściowych)
  - `401 Unauthorized` (brak sesji)
  - `403 Forbidden` (brak dostępu do zasobu)
  - `409 Conflict` (duplikat sezonu w harmonogramach)
  - `500 Internal Server Error`

## 5. Przepływ danych
1. Endpoint `src/pages/api/plants.ts` odbiera żądanie i waliduje JSON (Zod).
2. Pobranie użytkownika z sesji (Supabase Auth) w `context.locals`.
3. Wywołanie serwisu w `src/lib/services/plant-card.service.ts`:
   - zapis `plant_card` z `user_id`,
   - zapis `seasonal_schedule` dla każdego sezonu (z `plant_card_id`),
   - zapis `disease_entry` dla każdej choroby (z `plant_card_id`),
   - odczyt pełnego rekordu z relacjami (join) i mapowanie na `PlantCardDetailDto`.
4. Zwrócenie odpowiedzi `ApiResponseDto` z kodem 201.

## 6. Względy bezpieczeństwa
- Uwierzytelnianie: wymagane aktywne logowanie (Supabase Auth).
- Autoryzacja: `user_id` ustawiany po stronie serwera z sesji; klient nie może go nadpisać.
- Walidacja: pełna walidacja długości pól, enumów (`difficulty`, `season`) i formatu `color_hex`.
- Ochrona przed masowym przypisaniem: jawne mapowanie pól do insertów.
- RLS: upewnić się, że polityki Supabase blokują insert dla nieautoryzowanych użytkowników.

## 7. Obsługa błędów
- 400: błędny JSON, przekroczone limity długości, błędny format hex, brak `name`.
- 401: brak użytkownika w sesji.
- 403: Supabase zwrócił brak uprawnień do insertu.
- 409: naruszenie unikalności (`plant_card_id`, `season`) w `seasonal_schedule`.
- 500: nieobsłużone wyjątki, błędy po stronie bazy.
- Rejestrowanie błędów: brak tabeli błędów w schemacie, więc logować do konsoli (`console.error`) oraz polegać na logach Supabase.

## 8. Wydajność
- Wstawienia zbiorcze dla `schedules` i `diseases` (jedno `insert` per tabela).
- Ograniczenie liczby zapytań: odczyt pełnego rekordu po utworzeniu jednym zapytaniem z relacjami.
- Walidacja po stronie serwera minimalizuje błędne zapisy i rollback.

## 9. Kroki implementacji
1. Utworzyć endpoint `src/pages/api/plants.ts` (Astro Server Endpoint) z `export const prerender = false`.
2. Zdefiniować schemat Zod dla `PlantCardCreateCommand` zgodny ze specyfikacją (limity długości, enumy, regex hex).
3. Utworzyć serwis `src/lib/services/plant-card.service.ts` z funkcją `createPlantCard`.
4. W serwisie:
   - użyć klienta Supabase z `context.locals` (nie importować bezpośrednio),
   - wstawić `plant_card` i pobrać `id`,
   - wstawić `seasonal_schedule` (bulk) i `disease_entry` (bulk),
   - odczytać utworzoną kartę z relacjami i zmapować na `PlantCardDetailDto`.
5. Zwrócić `ApiResponseDto<PlantCardDetailDto>` z kodem 201.
6. Obsłużyć błędy Supabase, mapując je na kody 400/401/403/409/500.
7. Dodać testy (jeśli repo posiada framework) dla: poprawnego payloadu, braku sesji, duplikatu sezonu, złego formatu `color_hex`.
